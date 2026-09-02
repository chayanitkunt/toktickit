import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getPrisma } from "./prisma.js";


// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());
const uploadDir = path.resolve("uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, JPEG, PNG, WEBP, and PDF files are allowed"));
    }
  },
});

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
// Issue 12 — Development Requester list
// Return only active Requesters for the temporary Development Requester
// selection flow used before authentication is introduced in Lab 3.
// ---------------------------------------------------------------------------
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().requester.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    res.status(200).json(requesters);
  } catch {
    res.status(500).json({
      error: "Unable to retrieve requesters",
    });
  }
});
// ---------------------------------------------------------------------------
// Issue 14 — Create Ticket
// ---------------------------------------------------------------------------

function getRequesterId(req: Request): number | null {
  const value = req.header("X-Requester-Id");

  if (!value) {
    return null;
  }

  const requesterId = Number(value);

  return Number.isInteger(requesterId) && requesterId > 0
    ? requesterId
    : null;
}


app.post(
  "/api/tickets",
  upload.array("attachments", 5),
  async (req: Request, res: Response) => {
  try {
    const requesterId = getRequesterId(req);

    if (!requesterId) {
      return res.status(400).json({
        statusCode: 400,
        message: "X-Requester-Id header is required",
      });
    }

    const requester = await getPrisma().requester.findFirst({
      where: {
        id: requesterId,
        isActive: true,
      },
    });

    if (!requester) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid or inactive requester",
      });
    }

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

const year = new Date().getFullYear();

const ticketNumber = `TKT-${year}-${ticket.id
  .toString()
  .padStart(6, "0")}`;

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

app.get("/api/tickets", async (req: Request, res: Response) => {
  try {
    const requesterId = getRequesterId(req);

    if (!requesterId) {
      return res.status(400).json({
        statusCode: 400,
        message: "X-Requester-Id header is required",
      });
    }

    // Verify that the requester exists and is active.
    const requester = await getPrisma().requester.findFirst({
      where: {
        id: requesterId,
        isActive: true,
      },
    });

    if (!requester) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid or inactive requester",
      });
    }

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
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
        "PENDING",
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
      currentStatus: ticket.currentStatus,
      lastUpdated: ticket.updatedAt,
      attachmentCount: ticket.attachments.length,
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

app.get("/api/tickets/:id", async (req: Request, res: Response) => {
  try {
    const requesterId = getRequesterId(req);

    if (!requesterId) {
      return res.status(400).json({
        statusCode: 400,
        message: "X-Requester-Id header is required",
      });
    }

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

app.get(
  "/api/tickets/:id/attachments/:attachmentId/download",
  async (req: Request, res: Response) => {
    try {
      const requesterId = getRequesterId(req);

      if (!requesterId) {
        return res.status(400).json({
          statusCode: 400,
          message: "X-Requester-Id header is required",
        });
      }

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

      // Find the attachment together with its ticket owner
      const attachment = await getPrisma().attachment.findFirst({
        where: {
          id: attachmentId,
          ticketId,
          ticket: {
            requesterId,
          },
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
  upload.array("attachments", 5),
  async (req: Request, res: Response) => {
    try {
      const requesterId = getRequesterId(req);

      if (!requesterId) {
        return res.status(400).json({
          statusCode: 400,
          message: "X-Requester-Id header is required",
        });
      }

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
  async (req: Request, res: Response) => {
    try {
      const requesterId = getRequesterId(req);

      if (!requesterId) {
        return res.status(400).json({
          statusCode: 400,
          message: "X-Requester-Id header is required",
        });
      }

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
