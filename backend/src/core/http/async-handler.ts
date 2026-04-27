import type { NextFunction, Request, Response } from "express";

/**
 * Wraps an async route handler so any rejected promise is forwarded to Express's
 * error-handling middleware (otherwise Express swallows async throws).
 */
export const asyncHandler =
  <T extends Request>(fn: (req: T, res: Response, next: NextFunction) => Promise<void>) =>
  (req: T, res: Response, next: NextFunction): void => {
    void fn(req, res, next).catch(next);
  };
