import { Router } from "express";

import { asyncHandler } from "../../core/http/async-handler";
import { authenticate } from "../../core/http/middleware/authenticate";
import { authorize } from "../../core/http/middleware/authorize";
import { ROLE_CODES } from "../shared/roles";
import { authController } from "./auth.controller";

const authRouter = Router();

authRouter.post("/register", asyncHandler(authController.register));
authRouter.post("/login", asyncHandler(authController.login));
authRouter.get("/me", authenticate, asyncHandler(authController.getMe));
authRouter.patch("/me", authenticate, asyncHandler(authController.updateMe));
authRouter.patch("/me/password", authenticate, asyncHandler(authController.changeMyPassword));
authRouter.post(
  "/admin/register",
  authenticate,
  authorize(ROLE_CODES.ADMIN),
  asyncHandler(authController.createAdmin)
);

export { authRouter };
