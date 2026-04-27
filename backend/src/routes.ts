import { Router } from "express";

import { authRouter } from "./modules/auth/auth.routes";
import { healthRouter } from "./modules/health/health.routes";
import { menusRouter } from "./modules/menus/menus.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { trucksRouter } from "./modules/trucks/trucks.routes";
import { uploadsRouter } from "./modules/uploads/uploads.routes";

/**
 * Composite API router. Every module exposes a single `*Router` and we mount
 * them here under their public prefix. This is the one and only place that
 * needs to know about the whole surface of the API.
 */
export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/trucks", trucksRouter);
apiRouter.use("/menus", menusRouter);
apiRouter.use("/orders", ordersRouter);
apiRouter.use("/uploads", uploadsRouter);
