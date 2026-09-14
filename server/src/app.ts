import express, { Request, Response } from "express";
import cors from "cors";
import session from "express-session";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getPrisma } from "./prisma.js";
import { formatTicketNumber } from "./ticketNumber.js";
import { isAllowedAttachmentMimeType } from "./attachmentValidation.js";
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  requireAuth,
  requirePasswordChangeComplete,
  requireRole,
} from "./auth.js";
import { isValidStatusTransition } from "./ticketStatusTransitions.js";
import type { CurrentStatus as PrismaCurrentStatus } from "@prisma/client";


// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

// credentials: true + a reflected (non-wildcard) origin are both required for
// the browser to send/receive the session cookie set below.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// ---------------------------------------------------------------------------
// Issue 3 — session middleware
// Server-side session, delivered as a signed httpOnly cookie. MemoryStore
// (express-session's default) is sufficient for this local-lab threat model
// and a single Node process; see docs/lab-03/specification.md §11.
// ---------------------------------------------------------------------------
app.use(
  session({
    name: "toktickit.sid",
    secret: process.env.SESSION_SECRET ?? "dev-only-insecure-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);
const uploadDir = path.resolve("uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (isAllowedAttachmentMimeType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, JPEG, PNG, WEBP, and PDF files are allowed"));
    }
  },
});

// ---------------------------------------------------------------------------
// Issue 3 — Authentication
//
// POST /api/auth/login              -> establishes a session
// POST /api/auth/logout             -> destroys it
// GET  /api/auth/me                 -> current identity (requireAuth only —
//                                       intentionally NOT behind
//                                       requirePasswordChangeComplete, per
//                                       BR-02's allowlist)
// POST /api/auth/change-password    -> same allowlist exemption
// ---------------------------------------------------------------------------

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.trim() === "" ||
      password === ""
    ) {
      return res.status(400).json({
        error: "Email and password are required",
        code: "invalid_input",
      });
    }

    // BR-13: email uniqueness/lookup is case-insensitive.
    const user = await getPrisma().user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
    });

    // BR-10/AC-03: unknown email, wrong password, and a correct-but-inactive
    // account all produce the exact same response — nothing distinguishes
    // them from outside the server.
    const rejectWithGenericError = () =>
      res.status(401).json({
        error: "Invalid email or password",
        code: "invalid_credentials",
      });

    if (!user || !user.isActive) {
      return rejectWithGenericError();
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);

    if (!passwordMatches) {
      return rejectWithGenericError();
    }

    // Regenerate the session id on privilege change (login) to avoid
    // session fixation, then store only the user id server-side.
    req.session.regenerate((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          error: "Unable to log in",
          code: "server_error",
        });
      }

      req.session.userId = user.id;

      return res.status(200).json({
        id: user.id,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      });
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Unable to log in",
      code: "server_error",
    });
  }
});

app.post("/api/auth/logout", (req: Request, res: Response) => {
  // FR-02/BR-12: logging out must invalidate the session server-side, not
  // just clear the cookie client-side, so a replayed cookie is rejected.
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        error: "Unable to log out",
        code: "server_error",
      });
    }

    res.clearCookie("toktickit.sid");
    return res.status(204).send();
  });
});

app.get("/api/auth/me", requireAuth, (req: Request, res: Response) => {
  // FR-03/AC-05: only ever the caller's own identity — requireAuth already
  // loaded it fresh from the database.
  return res.status(200).json(req.currentUser);
});

app.post(
  "/api/auth/change-password",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body ?? {};

      if (
        typeof currentPassword !== "string" ||
        typeof newPassword !== "string" ||
        currentPassword === ""
      ) {
        return res.status(400).json({
          error: "Current and new password are required",
          code: "invalid_input",
        });
      }

      const user = await getPrisma().user.findUnique({
        where: { id: req.currentUser!.id },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({
          error: "Authentication required",
          code: "not_authenticated",
        });
      }

      const currentPasswordMatches = await verifyPassword(
        currentPassword,
        user.passwordHash
      );

      if (!currentPasswordMatches) {
        return res.status(400).json({
          error: "Current password is incorrect",
          code: "invalid_current_password",
        });
      }

      const policy = validatePasswordPolicy(newPassword);

      if (!policy.valid) {
        return res.status(400).json({
          error: "New password does not meet the password requirements",
          code: "weak_password",
          details: policy.errors,
        });
      }

      const newPasswordSameAsOld = await verifyPassword(
        newPassword,
        user.passwordHash
      );

      if (newPasswordSameAsOld) {
        return res.status(400).json({
          error: "New password must be different from the current password",
          code: "password_reused",
        });
      }

      const newPasswordHash = await hashPassword(newPassword);

      await getPrisma().user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          mustChangePassword: false,
        },
      });

      return res.status(200).json({
        id: user.id,
        name: user.name,
        role: user.role,
        mustChangePassword: false,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to change password",
        code: "server_error",
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "TokTickIT API",
  });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// Add:  GET /api/categories
//   -> read categories from PostgreSQL via getPrisma().category.findMany(...)
//   -> return each { id, name } in a predictable (id) order
//   -> on failure, respond 500 with a safe message (no internal details)
// TODO(Issue 4): implement the route here.
// ---------------------------------------------------------------------------

app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    res.status(200).json(categories);
  } catch {
    res.status(500).json({
      error: "Unable to retrieve categories",
    });
  }
});

app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.json(systems);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      statusCode: 500,
      message: "Unable to retrieve related systems",
    });
  }
});

// ---------------------------------------------------------------------------
// Issue 4 — Requester identity
//
// Every Lab 2 Requester route below is now protected by requireAuth +
// requirePasswordChangeComplete + requireRole("REQUESTER"). Ownership always
// comes from req.currentUser!.id (the authenticated session), never from a
// client-supplied requesterId/X-Requester-Id — see BR-03/AC-06. The
// Development Requester list (GET /api/requesters) and the X-Requester-Id
// header it powered are removed entirely along with the client selector.
// ---------------------------------------------------------------------------
const requireRequester = [
  requireAuth,
  requirePasswordChangeComplete,
  requireRole("REQUESTER"),
];

// ---------------------------------------------------------------------------
// Issue 5 — IT Staff Ticket Queue
// requireStaff gates every /api/staff/... route to IT Staff and
// Administrator only (specification.md §5.2 Authorization Matrix). Unlike
// requireRequester, there is no ownership filter here by design — the queue
// is shared across the whole IT Staff team (FR-10).
// ---------------------------------------------------------------------------
const requireStaff = [
  requireAuth,
  requirePasswordChangeComplete,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
];

app.post(
  "/api/tickets",
  ...requireRequester,
  upload.array("attachments", 5),
  async (req: Request, res: Response) => {
  try {
    const requesterId = req.currentUser!.id;

    const {
      categoryId,
      relatedSystemId,
      requestedPriority,
      summary,
      description,
    } = req.body;

    const errors: Record<string, string> = {};

    const trimmedSummary =
      typeof summary === "string" ? summary.trim() : "";

    const trimmedDescription =
      typeof description === "string" ? description.trim() : "";

    if (trimmedSummary.length < 10) {
      errors.summary = "Summary must be at least 10 characters long";
    } else if (trimmedSummary.length > 150) {
      errors.summary = "Summary must not exceed 150 characters";
    }

    if (trimmedDescription.length < 20) {
      errors.description =
        "Description must be at least 20 characters long";
    } else if (trimmedDescription.length > 2000) {
      errors.description =
        "Description must not exceed 2000 characters";
    }

    const parsedCategoryId = Number(categoryId);

    if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
      errors.categoryId = "A valid category is required";
    }

    const parsedRelatedSystemId = Number(relatedSystemId);

    if (
      !Number.isInteger(parsedRelatedSystemId) ||
      parsedRelatedSystemId <= 0
    ) {
      errors.relatedSystemId = "A valid related system is required";
    }

    if (
      requestedPriority !== "LOW" &&
      requestedPriority !== "MEDIUM" &&
      requestedPriority !== "HIGH"
    ) {
      errors.requestedPriority =
        "Requested priority must be LOW, MEDIUM, or HIGH";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "Validation failed",
        errors,
      });
    }

    const category = await getPrisma().category.findUnique({
      where: {
        id: parsedCategoryId,
      },
    });

    if (!category) {
      return res.status(400).json({
        statusCode: 400,
        message: "Validation failed",
        errors: {
          categoryId: "Category does not exist",
        },
      });
    }

    const relatedSystem = await getPrisma().relatedSystem.findUnique({
      where: {
        id: parsedRelatedSystemId,
      },
    });

    if (!relatedSystem || !relatedSystem.isActive) {
      return res.status(400).json({
        statusCode: 400,
        message: "Validation failed",
        errors: {
          relatedSystemId:
            "Related system does not exist or is inactive",
        },
      });
    }


    const files = (req.files as Express.Multer.File[]) ?? [];

  const ticket = await getPrisma().ticket.create({
  data: {
    // Temporary unique value because the real ticket number
    // depends on the auto-generated ticket ID.
    ticketNumber: `TEMP-${Date.now()}-${Math.random()}`,
    requesterId,
    categoryId: parsedCategoryId,
    relatedSystemId: parsedRelatedSystemId,
    summary: trimmedSummary,
    description: trimmedDescription,
    requestedPriority,
    // BR-07: IT Priority defaults to Requested Priority on creation and may
    // only be changed by IT Staff/Administrator afterward.
    itPriority: requestedPriority,
    currentStatus: "NEW",
    attachments: {
      create: files.map((file) => ({
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        storagePath: file.path,
      })),
    },
  },
  include: {
    attachments: true,
  },
});

const ticketNumber = formatTicketNumber(ticket.id);

const updatedTicket = await getPrisma().ticket.update({
  where: {
    id: ticket.id,
  },
  data: {
    ticketNumber,
  },
  include: {
    attachments: true,
  },
});

return res.status(201).json(updatedTicket);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      statusCode: 500,
      message: "Unable to create ticket",
    });
  }
});

// ---------------------------------------------------------------------------
// Issue 15 — My Tickets
// Retrieve paginated tickets owned by the currently selected Requester.
// ---------------------------------------------------------------------------

app.get("/api/tickets", ...requireRequester, async (req: Request, res: Response) => {
  try {
    const requesterId = req.currentUser!.id;

    const {
      search,
      categoryId,
      priority,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = "1",
      pageSize = "10",
    } = req.query;

    // ---------------------------------------------------------
    // Pagination validation
    // ---------------------------------------------------------

    const parsedPage = Number(page);
    const parsedPageSize = Number(pageSize);

    if (
      !Number.isInteger(parsedPage) ||
      parsedPage < 1
    ) {
      return res.status(400).json({
        statusCode: 400,
        message: "Page must be a positive integer",
      });
    }

    if (
      !Number.isInteger(parsedPageSize) ||
      parsedPageSize < 1 ||
      parsedPageSize > 50
    ) {
      return res.status(400).json({
        statusCode: 400,
        message: "Page size must be between 1 and 50",
      });
    }

    // ---------------------------------------------------------
    // Build filters
    // ---------------------------------------------------------

    const where: any = {
      // IMPORTANT:
      // This is the ownership protection.
      requesterId,
    };

    if (typeof search === "string" && search.trim() !== "") {
      const searchText = search.trim();

      where.OR = [
        {
          ticketNumber: {
            contains: searchText,
            mode: "insensitive",
          },
        },
        {
          summary: {
            contains: searchText,
            mode: "insensitive",
          },
        },
      ];
    }

    if (categoryId !== undefined) {
      const parsedCategoryId = Number(categoryId);

      if (
        !Number.isInteger(parsedCategoryId) ||
        parsedCategoryId <= 0
      ) {
        return res.status(400).json({
          statusCode: 400,
          message: "categoryId must be a positive integer",
        });
      }

      where.categoryId = parsedCategoryId;
    }

    if (priority !== undefined) {
      if (
        priority !== "LOW" &&
        priority !== "MEDIUM" &&
        priority !== "HIGH"
      ) {
        return res.status(400).json({
          statusCode: 400,
          message: "Invalid priority",
        });
      }

      where.requestedPriority = priority;
    }

    if (status !== undefined) {
      const allowedStatuses = [
        "NEW",
        "OPEN",
        "IN_PROGRESS",
        "WAITING_FOR_REQUESTER",
        "RESOLVED",
        "CLOSED",
        "REOPENED",
        "CANCELLED",
      ];

      if (
        typeof status !== "string" ||
        !allowedStatuses.includes(status)
      ) {
        return res.status(400).json({
          statusCode: 400,
          message: "Invalid status",
        });
      }

      where.currentStatus = status;
    }

    // ---------------------------------------------------------
    // Sorting
    // ---------------------------------------------------------

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "ticketNumber",
      "summary",
      "requestedPriority",
      "currentStatus",
    ];

    const selectedSortBy =
      typeof sortBy === "string" && allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";

    const selectedSortOrder =
      sortOrder === "asc" ? "asc" : "desc";

    // ---------------------------------------------------------
    // Query database
    // ---------------------------------------------------------

    const skip = (parsedPage - 1) * parsedPageSize;

    const [tickets, total] = await Promise.all([
      getPrisma().ticket.findMany({
        where,
        skip,
        take: parsedPageSize,
        orderBy: {
          [selectedSortBy]: selectedSortOrder,
        },
        include: {
          category: {
            select: {
              name: true,
            },
          },
          relatedSystem: {
            select: {
              name: true,
            },
          },
          owner: {
            select: {
              name: true,
            },
          },
          attachments: {
            where: {
              isRemoved: false,
            },
            select: {
              id: true,
            },
          },
        },
      }),

      getPrisma().ticket.count({
        where,
      }),
    ]);

    // ---------------------------------------------------------
    // Transform database records to API response
    // ---------------------------------------------------------

    const data = tickets.map((ticket) => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      createdAt: ticket.createdAt,
      summary: ticket.summary,
      categoryName: ticket.category.name,
      relatedSystemName: ticket.relatedSystem.name,
      requestedPriority: ticket.requestedPriority,
      itPriority: ticket.itPriority,
      currentStatus: ticket.currentStatus,
      lastUpdated: ticket.updatedAt,
      attachmentCount: ticket.attachments.length,
      ownerName: ticket.owner?.name ?? null,
      problemAppearsResolved: ticket.problemAppearsResolved,
    }));

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(total / parsedPageSize);

    return res.status(200).json({
      data,
      meta: {
        total,
        page: parsedPage,
        pageSize: parsedPageSize,
        totalPages,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      statusCode: 500,
      message: "Unable to retrieve tickets",
    });
  }
});

// ---------------------------------------------------------------------------
// Issue 16 — Ticket Detail
// Retrieve a ticket owned by the currently selected Requester.
// ---------------------------------------------------------------------------

app.get("/api/tickets/:id", ...requireRequester, async (req: Request, res: Response) => {
  try {
    const requesterId = req.currentUser!.id;

    const ticketId = Number(req.params.id);

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid ticket id",
      });
    }

    const ticket = await getPrisma().ticket.findFirst({
      where: {
        id: ticketId,
        requesterId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        relatedSystem: {
          select: {
            id: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            createdAt: true,
            isRemoved: true,
            removedAt: true,
            removedReason: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        statusCode: 404,
        message: "Ticket not found",
      });
    }

    return res.status(200).json(ticket);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      statusCode: 500,
      message: "Unable to retrieve ticket",
    });
  }
});

// ---------------------------------------------------------------------------
// Issue 5 — GitHub Issue #32: IT Staff Ticket Queue
//
// GET /api/staff/tickets — search, filter, sort, and paginate across every
// Ticket in the system (no ownership scoping — see requireStaff above).
// Query params follow docs/lab-03/api-spec.md:
//   q, status, priority (IT Priority), requestedPriority, categoryId,
//   ownerId ("me" | "unassigned" | a positive integer),
//   sort (createdAt|updatedAt|ticketNumber|priority), dir (asc|desc),
//   page, pageSize (max 50).
// Every unsupported/invalid value returns 400 rather than being silently
// ignored, per the handout's "invalid query parameters" requirement.
// ---------------------------------------------------------------------------
const STAFF_SORT_FIELD_MAP: Record<string, string> = {
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  ticketNumber: "ticketNumber",
  priority: "itPriority",
};

const ALLOWED_CURRENT_STATUSES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];

const ALLOWED_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

app.get(
  "/api/staff/tickets",
  ...requireStaff,
  async (req: Request, res: Response) => {
    try {
      const {
        q,
        status,
        priority,
        requestedPriority,
        categoryId,
        ownerId,
        sort = "updatedAt",
        dir = "desc",
        page = "1",
        pageSize = "10",
      } = req.query;

      // ---------------------------------------------------------
      // Pagination validation
      // ---------------------------------------------------------
      const parsedPage = Number(page);
      const parsedPageSize = Number(pageSize);

      if (!Number.isInteger(parsedPage) || parsedPage < 1) {
        return res.status(400).json({
          error: "page must be a positive integer",
          code: "invalid_input",
        });
      }

      if (
        !Number.isInteger(parsedPageSize) ||
        parsedPageSize < 1 ||
        parsedPageSize > 50
      ) {
        return res.status(400).json({
          error: "pageSize must be between 1 and 50",
          code: "invalid_input",
        });
      }

      // ---------------------------------------------------------
      // Sorting validation
      // ---------------------------------------------------------
      if (typeof sort !== "string" || !(sort in STAFF_SORT_FIELD_MAP)) {
        return res.status(400).json({
          error: "Invalid sort field",
          code: "invalid_input",
        });
      }

      if (dir !== "asc" && dir !== "desc") {
        return res.status(400).json({
          error: 'dir must be "asc" or "desc"',
          code: "invalid_input",
        });
      }

      const sortField = STAFF_SORT_FIELD_MAP[sort];
      const sortDir = dir as "asc" | "desc";

      // ---------------------------------------------------------
      // Build filters
      // ---------------------------------------------------------
      const where: any = {};

      if (typeof q === "string" && q.trim() !== "") {
        const searchText = q.trim();

        where.OR = [
          { ticketNumber: { contains: searchText, mode: "insensitive" } },
          { summary: { contains: searchText, mode: "insensitive" } },
        ];
      }

      if (status !== undefined) {
        if (
          typeof status !== "string" ||
          !ALLOWED_CURRENT_STATUSES.includes(status)
        ) {
          return res.status(400).json({
            error: "Invalid status",
            code: "invalid_input",
          });
        }

        where.currentStatus = status;
      }

      if (priority !== undefined) {
        if (
          typeof priority !== "string" ||
          !ALLOWED_PRIORITIES.includes(priority)
        ) {
          return res.status(400).json({
            error: "Invalid priority",
            code: "invalid_input",
          });
        }

        where.itPriority = priority;
      }

      if (requestedPriority !== undefined) {
        if (
          typeof requestedPriority !== "string" ||
          !ALLOWED_PRIORITIES.includes(requestedPriority)
        ) {
          return res.status(400).json({
            error: "Invalid requestedPriority",
            code: "invalid_input",
          });
        }

        where.requestedPriority = requestedPriority;
      }

      if (categoryId !== undefined) {
        const parsedCategoryId = Number(categoryId);

        if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
          return res.status(400).json({
            error: "categoryId must be a positive integer",
            code: "invalid_input",
          });
        }

        where.categoryId = parsedCategoryId;
      }

      if (ownerId !== undefined) {
        if (ownerId === "unassigned") {
          where.ownerId = null;
        } else if (ownerId === "me") {
          where.ownerId = req.currentUser!.id;
        } else {
          const parsedOwnerId = Number(ownerId);

          if (!Number.isInteger(parsedOwnerId) || parsedOwnerId <= 0) {
            return res.status(400).json({
              error:
                'ownerId must be "me", "unassigned", or a positive integer',
              code: "invalid_input",
            });
          }

          where.ownerId = parsedOwnerId;
        }
      }

      // ---------------------------------------------------------
      // Query database
      // ---------------------------------------------------------
      const skip = (parsedPage - 1) * parsedPageSize;

      const [tickets, total] = await Promise.all([
        getPrisma().ticket.findMany({
          where,
          skip,
          take: parsedPageSize,
          orderBy: { [sortField]: sortDir },
          include: {
            category: { select: { name: true } },
            owner: { select: { id: true, name: true } },
          },
        }),

        getPrisma().ticket.count({ where }),
      ]);

      const data = tickets.map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        createdAt: ticket.createdAt,
        summary: ticket.summary,
        categoryName: ticket.category.name,
        requestedPriority: ticket.requestedPriority,
        itPriority: ticket.itPriority,
        currentStatus: ticket.currentStatus,
        ownerId: ticket.ownerId,
        ownerName: ticket.owner?.name ?? null,
        lastUpdated: ticket.updatedAt,
      }));

      const totalPages =
        total === 0 ? 0 : Math.ceil(total / parsedPageSize);

      return res.status(200).json({
        data,
        meta: {
          total,
          page: parsedPage,
          pageSize: parsedPageSize,
          totalPages,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to retrieve the ticket queue",
        code: "server_error",
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Issue 5 — IT Staff Ticket Detail (read)
// Unlike the Requester's GET /api/tickets/:id, there is no ownership filter:
// any active IT Staff or Administrator may open any Ticket (FR-10). Claiming,
// reassigning, IT Priority, status changes, and Internal Notes are a
// separate issue (IT Staff Ticket operations) — this route only supports
// the "Open Ticket Detail" action from the queue.
// ---------------------------------------------------------------------------
app.get(
  "/api/staff/tickets/:id",
  ...requireStaff,
  async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);

      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(400).json({
          error: "Invalid ticket id",
          code: "invalid_input",
        });
      }

      const ticket = await getPrisma().ticket.findUnique({
        where: { id: ticketId },
        include: {
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          requester: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
          attachments: {
            select: {
              id: true,
              fileName: true,
              fileSize: true,
              mimeType: true,
              createdAt: true,
              isRemoved: true,
              removedAt: true,
              removedReason: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!ticket) {
        return res.status(404).json({
          error: "Ticket not found",
          code: "not_found",
        });
      }

      return res.status(200).json(ticket);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to retrieve ticket",
        code: "server_error",
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Issue 6 — IT Staff Ticket Detail operations (GitHub Issue #33)
//
// Shared helper: every route below (claim, priority, status, notes) needs
// the same "does this ticket exist" check before doing anything else, and
// the same safe 404 for a bad id. Role is already fully handled by
// requireStaff — there is no ownership scoping for staff routes (FR-10).
// ---------------------------------------------------------------------------
async function loadStaffTicketOrRespond(
  res: Response,
  ticketId: number
) {
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    res.status(400).json({ error: "Invalid ticket id", code: "invalid_input" });
    return null;
  }

  const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId } });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found", code: "not_found" });
    return null;
  }

  return ticket;
}

// GET /api/staff/eligible-owners — active IT Staff/Administrator users, for
// the Ticket Owner dropdown (ui-spec.md §5). Not part of the original
// api-spec.md table; documented as an addition there alongside this route,
// since the dropdown has no other way to know who is assignable (BR-06).
app.get(
  "/api/staff/eligible-owners",
  ...requireStaff,
  async (_req: Request, res: Response) => {
    try {
      const owners = await getPrisma().user.findMany({
        where: {
          isActive: true,
          role: { in: ["IT_STAFF", "ADMINISTRATOR"] },
        },
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      });

      return res.status(200).json(owners);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to retrieve eligible Ticket Owners",
        code: "server_error",
      });
    }
  }
);

// POST /api/staff/tickets/:id/claim — FR-11/BR-06/AC-11.
// Omit ownerId to self-claim; provide it to assign/reassign to another
// eligible (active IT Staff/Administrator) user, regardless of who
// currently owns the ticket.
app.post(
  "/api/staff/tickets/:id/claim",
  ...requireStaff,
  async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      const ticket = await loadStaffTicketOrRespond(res, ticketId);
      if (!ticket) return;

      const { ownerId } = req.body ?? {};
      let targetOwnerId: number;

      if (ownerId === undefined || ownerId === null) {
        targetOwnerId = req.currentUser!.id;
      } else if (Number.isInteger(ownerId) && ownerId > 0) {
        targetOwnerId = ownerId;
      } else {
        return res.status(400).json({
          error: "ownerId must be a positive integer",
          code: "invalid_input",
        });
      }

      // BR-06: only an active IT Staff or Administrator may be a Ticket
      // Owner — reject an inactive user or a Requester with 422, not 400,
      // since the shape of the request is valid but the value is not.
      const targetUser = await getPrisma().user.findUnique({
        where: { id: targetOwnerId },
      });

      if (
        !targetUser ||
        !targetUser.isActive ||
        (targetUser.role !== "IT_STAFF" && targetUser.role !== "ADMINISTRATOR")
      ) {
        return res.status(422).json({
          error: "Ticket Owner must be an active IT Staff or Administrator user",
          code: "invalid_owner",
        });
      }

      const updated = await getPrisma().ticket.update({
        where: { id: ticketId },
        data: { ownerId: targetOwnerId },
        include: { owner: { select: { id: true, name: true } } },
      });

      return res.status(200).json({ id: updated.id, owner: updated.owner });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to update Ticket Owner",
        code: "server_error",
      });
    }
  }
);

// PATCH /api/staff/tickets/:id/priority — FR-12/BR-07/AC-12.
app.patch(
  "/api/staff/tickets/:id/priority",
  ...requireStaff,
  async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      const ticket = await loadStaffTicketOrRespond(res, ticketId);
      if (!ticket) return;

      const { itPriority } = req.body ?? {};

      if (typeof itPriority !== "string" || !ALLOWED_PRIORITIES.includes(itPriority)) {
        return res.status(400).json({
          error: "itPriority must be LOW, MEDIUM, or HIGH",
          code: "invalid_input",
        });
      }

      const updated = await getPrisma().ticket.update({
        where: { id: ticketId },
        data: { itPriority: itPriority as "LOW" | "MEDIUM" | "HIGH" },
      });

      return res.status(200).json({ id: updated.id, itPriority: updated.itPriority });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to update IT Priority",
        code: "server_error",
      });
    }
  }
);

// PATCH /api/staff/tickets/:id/status — FR-13/BR-08/AC-13.
// Validated against the transition matrix in ticketStatusTransitions.ts;
// an illegal transition is rejected with 422 and the ticket is unchanged.
app.patch(
  "/api/staff/tickets/:id/status",
  ...requireStaff,
  async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      const ticket = await loadStaffTicketOrRespond(res, ticketId);
      if (!ticket) return;

      const { currentStatus } = req.body ?? {};

      if (
        typeof currentStatus !== "string" ||
        !ALLOWED_CURRENT_STATUSES.includes(currentStatus)
      ) {
        return res.status(400).json({
          error: "Invalid status",
          code: "invalid_input",
        });
      }

      if (!isValidStatusTransition(ticket.currentStatus, currentStatus)) {
        return res.status(422).json({
          error: `Cannot move a ticket from ${ticket.currentStatus} to ${currentStatus}`,
          code: "invalid_transition",
        });
      }

      const updated = await getPrisma().ticket.update({
        where: { id: ticketId },
        data: { currentStatus: currentStatus as PrismaCurrentStatus },
      });

      return res.status(200).json({ id: updated.id, currentStatus: updated.currentStatus });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to update ticket status",
        code: "server_error",
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Internal Notes (BR-04/FR-14) — deliberately a separate resource from
// Public Comments (see the §Comments note further down): IT Staff/
// Administrator only, both to read and to create. A Requester never reaches
// these routes at all — requireStaff rejects with 403 before any ticket
// lookup happens, so no note content is ever computed for a Requester
// caller (AC-15).
// ---------------------------------------------------------------------------
app.get(
  "/api/staff/tickets/:id/notes",
  ...requireStaff,
  async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      const ticket = await loadStaffTicketOrRespond(res, ticketId);
      if (!ticket) return;

      const notes = await getPrisma().ticketNote.findMany({
        where: { ticketId },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, role: true } } },
      });

      return res.status(200).json(
        notes.map((note) => ({
          id: note.id,
          content: note.content,
          createdAt: note.createdAt,
          author: note.author,
        }))
      );
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to retrieve Internal Notes",
        code: "server_error",
      });
    }
  }
);

app.post(
  "/api/staff/tickets/:id/notes",
  ...requireStaff,
  async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      const ticket = await loadStaffTicketOrRespond(res, ticketId);
      if (!ticket) return;

      const { content } = req.body ?? {};
      const trimmed = typeof content === "string" ? content.trim() : "";

      // BR-09: empty/whitespace-only content rejected; same 2000-char cap
      // as Public Comments.
      if (trimmed === "") {
        return res.status(400).json({
          error: "Note content is required",
          code: "invalid_input",
        });
      }

      if (trimmed.length > 2000) {
        return res.status(400).json({
          error: "Note must be 2000 characters or fewer",
          code: "invalid_input",
        });
      }

      const note = await getPrisma().ticketNote.create({
        data: {
          ticketId,
          authorId: req.currentUser!.id,
          content: trimmed,
        },
        include: { author: { select: { id: true, name: true, role: true } } },
      });

      return res.status(201).json({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt,
        author: note.author,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to post Internal Note",
        code: "server_error",
      });
    }
  }
);

app.get(
  "/api/tickets/:id/attachments/:attachmentId/download",
  requireAuth,
  requirePasswordChangeComplete,
  async (req: Request, res: Response) => {
    try {
      const currentUser = req.currentUser!;
      const isStaffOrAdmin =
        currentUser.role === "IT_STAFF" || currentUser.role === "ADMINISTRATOR";

      const ticketId = Number(req.params.id);
      const attachmentId = Number(req.params.attachmentId);

      if (
        !Number.isInteger(ticketId) ||
        ticketId <= 0 ||
        !Number.isInteger(attachmentId) ||
        attachmentId <= 0
      ) {
        return res.status(400).json({
          statusCode: 400,
          message: "Invalid ticket or attachment ID",
        });
      }

      // Issue 6: IT Staff/Administrator may download an attachment on any
      // ticket (FR-10 — no ownership scoping for staff). A Requester may
      // only download from a ticket they own, same as Lab 2.
      const attachment = await getPrisma().attachment.findFirst({
        where: {
          id: attachmentId,
          ticketId,
          ...(isStaffOrAdmin ? {} : { ticket: { requesterId: currentUser.id } }),
        },
      });

      if (!attachment) {
        return res.status(404).json({
          statusCode: 404,
          message: "Attachment not found",
        });
      }

      // Removed attachments cannot be downloaded
      if (attachment.isRemoved) {
        return res.status(404).json({
          statusCode: 404,
          message: "Attachment not found",
        });
      }

      // Make sure the stored file actually exists
      if (!fs.existsSync(attachment.storagePath)) {
        return res.status(404).json({
          statusCode: 404,
          message: "Attachment file not found",
        });
      }

      return res.download(
        attachment.storagePath,
        attachment.fileName
      );
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        statusCode: 500,
        message: "Unable to download attachment",
      });
    }
  }
);

app.post(
  "/api/tickets/:id/attachments",
  ...requireRequester,
  upload.array("attachments", 5),
  async (req: Request, res: Response) => {
    try {
      const requesterId = req.currentUser!.id;

      const ticketId = Number(req.params.id);

      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(400).json({
          statusCode: 400,
          message: "Invalid ticket ID",
        });
      }

      // Check ticket ownership
      const ticket = await getPrisma().ticket.findFirst({
        where: {
          id: ticketId,
          requesterId,
        },
      });

      if (!ticket) {
        return res.status(404).json({
          statusCode: 404,
          message: "Ticket not found",
        });
      }

      const files = (req.files as Express.Multer.File[]) ?? [];

      if (files.length === 0) {
        return res.status(400).json({
          statusCode: 400,
          message: "At least one attachment is required",
        });
      }

      // Count only active attachments
      const activeAttachmentCount =
        await getPrisma().attachment.count({
          where: {
            ticketId,
            isRemoved: false,
          },
        });

      if (activeAttachmentCount + files.length > 5) {
        // Remove uploaded files because they cannot be stored
        for (const file of files) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }

        return res.status(400).json({
          statusCode: 400,
          message: "A ticket cannot have more than 5 active attachments",
        });
      }

      const attachments = await getPrisma().attachment.createMany({
        data: files.map((file) => ({
          ticketId,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          storagePath: file.path,
        })),
      });

      return res.status(201).json({
        count: attachments.count,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        statusCode: 500,
        message: "Unable to add attachments",
      });
    }
  }
);

app.delete(
  "/api/tickets/:id/attachments/:attachmentId",
  ...requireRequester,
  async (req: Request, res: Response) => {
    try {
      const requesterId = req.currentUser!.id;

      const ticketId = Number(req.params.id);
      const attachmentId = Number(req.params.attachmentId);

      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(400).json({
          statusCode: 400,
          message: "Invalid ticket ID",
        });
      }

      if (!Number.isInteger(attachmentId) || attachmentId <= 0) {
        return res.status(400).json({
          statusCode: 400,
          message: "Invalid attachment ID",
        });
      }

      const ticket = await getPrisma().ticket.findFirst({
        where: {
          id: ticketId,
          requesterId,
        },
      });

      if (!ticket) {
        return res.status(404).json({
          statusCode: 404,
          message: "Ticket not found",
        });
      }

      const attachment = await getPrisma().attachment.findFirst({
        where: {
          id: attachmentId,
          ticketId,
          isRemoved: false,
        },
      });

      if (!attachment) {
        return res.status(404).json({
          statusCode: 404,
          message: "Attachment not found",
        });
      }

      const { reason } = req.body;

      if (typeof reason !== "string" || reason.trim() === "") {
        return res.status(400).json({
          statusCode: 400,
          message: "Removal reason is required",
        });
      }

      const updatedAttachment =
        await getPrisma().attachment.update({
          where: {
            id: attachmentId,
          },
          data: {
            isRemoved: true,
            removedAt: new Date(),
            removedReason: reason.trim(),
          },
        });

      return res.status(200).json({
        id: updatedAttachment.id,
        isRemoved: updatedAttachment.isRemoved,
        removedAt: updatedAttachment.removedAt,
        removedReason: updatedAttachment.removedReason,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        statusCode: 500,
        message: "Unable to remove attachment",
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Issue 4 — Public Comments (BR-04)
// Shared endpoint for Requester (owner only), IT Staff, and Administrator —
// see docs/lab-03/api-spec.md §Comments for why this is one route rather
// than a duplicate /api/staff/... path. Internal Notes are a deliberately
// separate resource (a later issue) since their visibility rule differs.
// ---------------------------------------------------------------------------
async function loadCommentableTicket(
  req: Request,
  res: Response,
  ticketId: number
) {
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    res.status(400).json({ error: "Invalid ticket id", code: "invalid_input" });
    return null;
  }

  const ticket = await getPrisma().ticket.findUnique({
    where: { id: ticketId },
  });

  const user = req.currentUser!;
  const isOwner = ticket?.requesterId === user.id;
  const isStaffOrAdmin =
    user.role === "IT_STAFF" || user.role === "ADMINISTRATOR";

  // A ticket that doesn't exist and a ticket the caller can't see look
  // identical from the outside — never reveal which one occurred.
  if (!ticket || (user.role === "REQUESTER" && !isOwner)) {
    res.status(404).json({ error: "Ticket not found", code: "not_found" });
    return null;
  }

  if (!isOwner && !isStaffOrAdmin) {
    res.status(403).json({
      error: "You do not have permission to access this ticket",
      code: "forbidden",
    });
    return null;
  }

  return ticket;
}

app.get(
  "/api/tickets/:id/comments",
  requireAuth,
  requirePasswordChangeComplete,
  async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      const ticket = await loadCommentableTicket(req, res, ticketId);
      if (!ticket) return;

      const comments = await getPrisma().ticketComment.findMany({
        where: { ticketId },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, role: true } } },
      });

      return res.status(200).json(
        comments.map((comment) => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          author: comment.author,
        }))
      );
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to retrieve comments",
        code: "server_error",
      });
    }
  }
);

app.post(
  "/api/tickets/:id/comments",
  requireAuth,
  requirePasswordChangeComplete,
  async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      const ticket = await loadCommentableTicket(req, res, ticketId);
      if (!ticket) return;

      const { content } = req.body ?? {};
      const trimmed = typeof content === "string" ? content.trim() : "";

      // BR-09: empty/whitespace-only content rejected; capped at 2000 chars.
      if (trimmed === "") {
        return res.status(400).json({
          error: "Comment content is required",
          code: "invalid_input",
        });
      }

      if (trimmed.length > 2000) {
        return res.status(400).json({
          error: "Comment must be 2000 characters or fewer",
          code: "invalid_input",
        });
      }

      const comment = await getPrisma().ticketComment.create({
        data: {
          ticketId,
          authorId: req.currentUser!.id,
          content: trimmed,
        },
        include: { author: { select: { id: true, name: true, role: true } } },
      });

      return res.status(201).json({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        author: comment.author,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to post comment",
        code: "server_error",
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Issue 4 — "Problem Appears Resolved" (FR-08/BR-05)
// Owning Requester only. Never changes currentStatus — formally
// resolving/closing a Ticket remains IT Staff/Administrator territory.
// ---------------------------------------------------------------------------
app.patch(
  "/api/tickets/:id/resolution-flag",
  ...requireRequester,
  async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);

      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(400).json({
          error: "Invalid ticket id",
          code: "invalid_input",
        });
      }

      const { problemAppearsResolved, currentStatus } = req.body ?? {};

      // BR-05: a Requester may only ever set the flag, never the status —
      // reject outright rather than silently ignoring the extra field.
      if (currentStatus !== undefined) {
        return res.status(403).json({
          error: "Requesters cannot change ticket status directly",
          code: "forbidden",
        });
      }

      if (typeof problemAppearsResolved !== "boolean") {
        return res.status(400).json({
          error: "problemAppearsResolved must be true or false",
          code: "invalid_input",
        });
      }

      const ticket = await getPrisma().ticket.findFirst({
        where: { id: ticketId, requesterId: req.currentUser!.id },
      });

      if (!ticket) {
        return res.status(404).json({
          error: "Ticket not found",
          code: "not_found",
        });
      }

      const updated = await getPrisma().ticket.update({
        where: { id: ticketId },
        data: { problemAppearsResolved },
      });

      return res.status(200).json({
        id: updated.id,
        problemAppearsResolved: updated.problemAppearsResolved,
        currentStatus: updated.currentStatus,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Unable to update ticket",
        code: "server_error",
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Global error handler — must be registered last.
// Catches Multer errors (invalid file type from fileFilter, oversized file,
// too many files) and any other error that reaches next(err) without being
// handled by a route's own try/catch, and returns a clean JSON response
// instead of falling through to Express's default HTML error page.
// ---------------------------------------------------------------------------
app.use(
  (
    err: unknown,
    _req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction
  ) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          statusCode: 400,
          message: "Each attachment must be 5 MB or smaller",
        });
      }

      if (err.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          statusCode: 400,
          message: "A ticket cannot have more than 5 attachments",
        });
      }

      return res.status(400).json({
        statusCode: 400,
        message: err.message,
      });
    }

    if (err instanceof Error) {
      // Thrown by the multer fileFilter for disallowed file types.
      return res.status(400).json({
        statusCode: 400,
        message: err.message,
      });
    }

    console.error(err);

    return res.status(500).json({
      statusCode: 500,
      message: "Unexpected server error",
    });
  }
);

export default app;
