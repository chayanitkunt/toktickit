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

function generateTicketNumber(): string {
  const year = new Date().getFullYear();
  const number = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");

  return `TKT-${year}-${number}`;
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

    let ticketNumber = generateTicketNumber();

    for (let attempt = 0; attempt < 5; attempt++) {
      const existingTicket = await getPrisma().ticket.findUnique({
        where: {
          ticketNumber,
        },
      });

      if (!existingTicket) {
        break;
      }

      ticketNumber = generateTicketNumber();
    }

    const files = (req.files as Express.Multer.File[]) ?? [];

const ticket = await getPrisma().ticket.create({
  data: {
    ticketNumber,
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

    return res.status(201).json(ticket);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      statusCode: 500,
      message: "Unable to create ticket",
    });
  }
});

export default app;
