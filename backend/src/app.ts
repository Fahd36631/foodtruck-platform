import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env } from "./config/env";
import { errorHandler } from "./core/http/middleware/error-handler";
import { notFoundHandler } from "./core/http/middleware/not-found-handler";
import { logger } from "./core/logger/logger";
import { apiRouter } from "./routes";

const app = express();
const additionalCorsOrigins = (env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const lanPattern = /^https?:\/\/((10\.\d{1,3}\.\d{1,3}\.\d{1,3})|(192\.168\.\d{1,3}\.\d{1,3})|(172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}))(:\d+)?$/;

const isAllowedOrigin = (origin: string): boolean => {
  if (additionalCorsOrigins.includes(origin)) {
    return true;
  }

  return localhostPattern.test(origin) || lanPattern.test(origin);
};

// Observability + security middlewares.
app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("CORS origin is not allowed"));
    }
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200
  })
);
app.use(express.json());

// API surface.
app.use("/api/v1", apiRouter);

// Terminal middlewares (order matters: 404 before error handler).
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
