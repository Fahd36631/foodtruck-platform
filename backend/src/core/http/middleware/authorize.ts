import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../errors";

/**
 * Guards a route so only the listed role codes can access it.
 * Must run AFTER `authenticate` middleware.
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      throw new AppError("AUTH_UNAUTHORIZED");
    }

    if (!allowedRoles.includes(req.authUser.roleCode)) {
      throw new AppError("AUTH_FORBIDDEN");
    }

    next();
  };
};
