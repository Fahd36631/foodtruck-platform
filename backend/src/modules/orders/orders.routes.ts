import { Router } from "express";

import { asyncHandler } from "../../core/http/async-handler";
import { authenticate } from "../../core/http/middleware/authenticate";
import { authorize } from "../../core/http/middleware/authorize";
import { ROLE_CODES } from "../shared/roles";
import { ordersController } from "./orders.controller";

const ordersRouter = Router();

ordersRouter.use(authenticate);

ordersRouter.post("/", authorize(ROLE_CODES.CUSTOMER), asyncHandler(ordersController.create));
ordersRouter.get("/mine", authorize(ROLE_CODES.CUSTOMER), asyncHandler(ordersController.listMyOrders));
ordersRouter.get(
  "/mine/notifications",
  authorize(ROLE_CODES.CUSTOMER),
  asyncHandler(ordersController.listMyNotifications)
);
ordersRouter.post(
  "/:orderId/payment",
  authorize(ROLE_CODES.CUSTOMER),
  asyncHandler(ordersController.payOrder)
);
ordersRouter.post(
  "/:orderId/review",
  authorize(ROLE_CODES.CUSTOMER),
  asyncHandler(ordersController.submitReview)
);
ordersRouter.get(
  "/incoming",
  authorize(ROLE_CODES.TRUCK_OWNER, ROLE_CODES.ADMIN),
  asyncHandler(ordersController.listIncoming)
);
ordersRouter.patch(
  "/:orderId/status",
  authorize(ROLE_CODES.TRUCK_OWNER, ROLE_CODES.ADMIN),
  asyncHandler(ordersController.updateStatus)
);

export { ordersRouter };
