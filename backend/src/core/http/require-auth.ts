import type { Request } from "express";

import { AppError } from "../errors";
import type { AuthUser } from "../types/auth";

/**
 * Reads the authenticated user attached by `authenticate` middleware, or throws
 * a typed AppError. Use this inside controllers instead of re-implementing the
 * null-check everywhere.
 */
export const requireAuth = (req: Request): AuthUser => {
  if (!req.authUser) {
    throw new AppError("AUTH_UNAUTHORIZED");
  }

  return req.authUser;
};
