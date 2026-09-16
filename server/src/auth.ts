import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import { getPrisma } from "./prisma.js";

// ---------------------------------------------------------------------------
// Issue 3 — Authentication foundation
//
// This module owns:
//  - password hashing/verification (BR-11: bcrypt, cost >= 10)
//  - the password-strength policy shown on the Change Password screen
//  - the `requireAuth` / `requirePasswordChangeComplete` middleware pair
//
// Route handlers (login/logout/me/change-password) live in app.ts next to
// the rest of the API for now, but import everything they need from here.
// Issue 4 will import `requireAuth` to replace the X-Requester-Id header on
// the Lab 2 Requester routes with the authenticated session identity.
// ---------------------------------------------------------------------------

export const BCRYPT_COST = 10;

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, BCRYPT_COST);
}

export async function verifyPassword(
  plainTextPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash);
}

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

// Matches the rules shown under "Password must:" on the Change Password
// screen (handout §8.1): at least 8 characters, upper + lower case,
// a number, and a special character.
export function validatePasswordPolicy(password: unknown): PasswordPolicyResult {
  const errors: string[] = [];

  if (typeof password !== "string" || password.length === 0) {
    return { valid: false, errors: ["Password is required"] };
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must include a lowercase letter");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must include an uppercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must include a number");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must include a special character");
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Session + request typing
// ---------------------------------------------------------------------------

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export type AuthenticatedRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

// The subset of User that is ever safe to send to the client. Never include
// passwordHash here.
export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: AuthenticatedRole;
  isActive: boolean;
  mustChangePassword: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      currentUser?: SafeUser;
    }
  }
}

function toSafeUser(user: {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
}): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as AuthenticatedRole,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}

// ---------------------------------------------------------------------------
// requireAuth — BR-01/BR-12/BR-16
//
// Loads the user fresh from the database on every request (rather than
// trusting stale data cached in the session) so that a deactivation takes
// effect immediately, even for an already-logged-in session.
// ---------------------------------------------------------------------------
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({
      error: "Authentication required",
      code: "not_authenticated",
    });
  }

  try {
    const user = await getPrisma().user.findUnique({ where: { id: userId } });

    if (!user || !user.isActive) {
      // BR-16: a deactivated account loses access immediately, even with a
      // still-valid session cookie.
      return req.session.destroy(() => {
        res.status(401).json({
          error: "Authentication required",
          code: "not_authenticated",
        });
      });
    }

    req.currentUser = toSafeUser(user);
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Unable to verify authentication",
      code: "server_error",
    });
  }
}

// ---------------------------------------------------------------------------
// requirePasswordChangeComplete — BR-02
//
// Mount AFTER requireAuth. Blocks every route except the small allowlist
// the handout requires (/api/auth/change-password, /api/auth/me,
// /api/auth/logout), which are simply routes that never use this middleware.
// ---------------------------------------------------------------------------
export function requirePasswordChangeComplete(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.currentUser) {
    return res.status(401).json({
      error: "Authentication required",
      code: "not_authenticated",
    });
  }

  if (req.currentUser.mustChangePassword) {
    return res.status(403).json({
      error: "You must change your password before continuing",
      code: "password_change_required",
    });
  }

  return next();
}

// ---------------------------------------------------------------------------
// requireRole — convenience factory for §5.2's authorization matrix.
// Mount AFTER requireAuth (and usually after requirePasswordChangeComplete).
// ---------------------------------------------------------------------------
export function requireRole(...roles: AuthenticatedRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      return res.status(401).json({
        error: "Authentication required",
        code: "not_authenticated",
      });
    }

    if (!roles.includes(req.currentUser.role)) {
      return res.status(403).json({
        error: "You do not have permission to perform this action",
        code: "forbidden",
      });
    }

    return next();
  };
}
