import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { ok } from "../../core/http/api-response";
import { requireAuth } from "../../core/http/require-auth";
import { authService } from "./auth.service";
import {
  changePasswordSchema,
  createAdminSchema,
  loginSchema,
  registerSchema,
  resendCodeSchema,
  updateProfileSchema,
  verifyEmailSchema
} from "./auth.validator";

const register = async (req: Request, res: Response) => {
  const payload = registerSchema.parse(req.body);
  const result = await authService.register(payload);
  res.status(StatusCodes.CREATED).json(ok("Registration successful", result));
};

const login = async (req: Request, res: Response) => {
  const payload = loginSchema.parse(req.body);
  const result = await authService.login(payload);
  res.status(StatusCodes.OK).json(ok("Login successful", result));
};

const getMe = async (req: Request, res: Response) => {
  const authUser = requireAuth(req);
  const result = await authService.getMe(authUser.userId);
  res.status(StatusCodes.OK).json(ok("Profile loaded", result));
};

const updateMe = async (req: Request, res: Response) => {
  const authUser = requireAuth(req);
  const payload = updateProfileSchema.parse(req.body);
  const result = await authService.updateMe(authUser.userId, payload);
  res.status(StatusCodes.OK).json(ok("Profile updated", result));
};

const changeMyPassword = async (req: Request, res: Response) => {
  const authUser = requireAuth(req);
  const payload = changePasswordSchema.parse(req.body);
  await authService.changeMyPassword(authUser.userId, payload);
  res.status(StatusCodes.OK).json(ok("Password updated", null));
};

const createAdmin = async (req: Request, res: Response) => {
  const payload = createAdminSchema.parse(req.body);
  const result = await authService.createAdmin(payload);
  res.status(StatusCodes.CREATED).json(ok("Admin account created", result));
};

const verifyEmail = async (req: Request, res: Response) => {
  const payload = verifyEmailSchema.parse(req.body);
  const result = await authService.verifyEmail(payload);
  res.status(StatusCodes.OK).json(ok("Email verified successfully", result));
};

const resendCode = async (req: Request, res: Response) => {
  const payload = resendCodeSchema.parse(req.body);
  const result = await authService.resendCode(payload);
  res.status(StatusCodes.OK).json(ok("Verification code sent", result));
};

export const authController = {
  register,
  login,
  getMe,
  updateMe,
  changeMyPassword,
  createAdmin,
  verifyEmail,
  resendCode
};
