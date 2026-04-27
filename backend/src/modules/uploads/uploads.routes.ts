import { Router } from "express";

import { authenticate } from "../../core/http/middleware/authenticate";
import { authorize } from "../../core/http/middleware/authorize";
import { ROLE_CODES } from "../shared/roles";
import { uploadSingle, uploadSingleMiddleware } from "./uploads.controller";

const uploadsRouter = Router();

uploadsRouter.post(
  "/single",
  authenticate,
  authorize(ROLE_CODES.TRUCK_OWNER, ROLE_CODES.ADMIN),
  uploadSingleMiddleware,
  uploadSingle
);

export { uploadsRouter };
