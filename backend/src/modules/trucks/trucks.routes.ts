import { Router } from "express";

import { asyncHandler } from "../../core/http/async-handler";
import { authenticate } from "../../core/http/middleware/authenticate";
import { authorize } from "../../core/http/middleware/authorize";
import { ROLE_CODES } from "../shared/roles";
import { trucksController } from "./trucks.controller";

const trucksRouter = Router();

// Public discovery for guests and logged-in users.
trucksRouter.get("/discovery", asyncHandler(trucksController.discover));
trucksRouter.get("/:truckId/details", asyncHandler(trucksController.details));

// Protected owner/admin/customer operations.
trucksRouter.post(
  "/",
  authenticate,
  authorize(ROLE_CODES.TRUCK_OWNER),
  asyncHandler(trucksController.registerTruck)
);
trucksRouter.get(
  "/mine",
  authenticate,
  authorize(ROLE_CODES.TRUCK_OWNER, ROLE_CODES.ADMIN),
  asyncHandler(trucksController.listMine)
);
trucksRouter.get(
  "/mine/notifications",
  authenticate,
  authorize(ROLE_CODES.TRUCK_OWNER),
  asyncHandler(trucksController.listMyNotifications)
);
trucksRouter.get(
  "/mine/draft",
  authenticate,
  authorize(ROLE_CODES.TRUCK_OWNER),
  asyncHandler(trucksController.getMyLatestDraft)
);
trucksRouter.patch(
  "/:truckId/profile",
  authenticate,
  authorize(ROLE_CODES.TRUCK_OWNER, ROLE_CODES.ADMIN),
  asyncHandler(trucksController.updateProfile)
);
trucksRouter.patch(
  "/:truckId/location",
  authenticate,
  authorize(ROLE_CODES.TRUCK_OWNER, ROLE_CODES.ADMIN),
  asyncHandler(trucksController.updateLocation)
);
trucksRouter.patch(
  "/:truckId/status",
  authenticate,
  authorize(ROLE_CODES.TRUCK_OWNER, ROLE_CODES.ADMIN),
  asyncHandler(trucksController.updateStatus)
);

trucksRouter.get(
  "/admin/pending",
  authenticate,
  authorize(ROLE_CODES.ADMIN),
  asyncHandler(trucksController.listPending)
);
trucksRouter.get(
  "/admin/stats",
  authenticate,
  authorize(ROLE_CODES.ADMIN),
  asyncHandler(trucksController.adminStats)
);
trucksRouter.patch(
  "/:truckId/admin/review",
  authenticate,
  authorize(ROLE_CODES.ADMIN),
  asyncHandler(trucksController.reviewTruckApproval)
);
trucksRouter.delete(
  "/:truckId",
  authenticate,
  authorize(ROLE_CODES.TRUCK_OWNER, ROLE_CODES.ADMIN),
  asyncHandler(trucksController.remove)
);

export { trucksRouter };
