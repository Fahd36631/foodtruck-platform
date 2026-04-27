import type { NextFunction, Request, Response } from "express";

import { ERROR_CATALOG } from "../../errors";
import { fail } from "../api-response";

export const notFoundHandler = (_req: Request, res: Response, _next: NextFunction): void => {
  const def = ERROR_CATALOG.ROUTE_NOT_FOUND;
  res.status(def.status).json(fail(def.message, { code: "ROUTE_NOT_FOUND" }));
};
