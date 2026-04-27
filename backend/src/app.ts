import path from "path";
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

// Observability + security middlewares.
app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200
  })
);
app.use(express.json());

// Static: user-uploaded files.
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// API surface.
app.use("/api/v1", apiRouter);

// Terminal middlewares (order matters: 404 before error handler).
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
