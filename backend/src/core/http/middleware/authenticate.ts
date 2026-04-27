import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../../../config/env";
import { AppError } from "../../errors";
import type { AccessTokenPayload } from "../../types/auth";

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new AppError("AUTH_UNAUTHORIZED", { message: "Missing or invalid authorization header" });
  }

  const token = authorizationHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    req.authUser = {
      userId: Number(payload.sub),
      roleCode: payload.roleCode,
      email: payload.email
    };
    next();
  } catch {
    throw new AppError("AUTH_INVALID_TOKEN");
  }
};
