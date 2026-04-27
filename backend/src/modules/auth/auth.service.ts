import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

import { env } from "../../config/env";
import { AppError } from "../../core/errors";
import { ROLE_CODES } from "../shared/roles";
import { authRepository } from "./auth.repository";
import type {
  ChangePasswordInput,
  CreateAdminInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput
} from "./auth.validator";

const register = async (payload: RegisterInput) => {
  const existingByEmail = await authRepository.findUserByEmail(payload.email);
  if (existingByEmail) {
    throw new AppError("AUTH_EMAIL_TAKEN");
  }

  const existingByPhone = await authRepository.findUserByPhone(payload.phone);
  if (existingByPhone) {
    throw new AppError("AUTH_PHONE_TAKEN");
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const roleCode = payload.roleCode === ROLE_CODES.TRUCK_OWNER ? ROLE_CODES.TRUCK_OWNER : ROLE_CODES.CUSTOMER;
  const selectedRole = await authRepository.findRoleByCode(roleCode);

  if (!selectedRole) {
    throw new AppError("AUTH_ROLE_NOT_CONFIGURED");
  }

  const userId = await authRepository.createUser({
    roleId: selectedRole.id,
    fullName: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    passwordHash
  });

  return { userId };
};

const login = async (payload: LoginInput) => {
  const user = await authRepository.findUserByEmail(payload.email);
  if (!user) {
    throw new AppError("AUTH_INVALID_CREDENTIALS");
  }

  const isValid = await bcrypt.compare(payload.password, user.password_hash);
  if (!isValid) {
    throw new AppError("AUTH_INVALID_CREDENTIALS");
  }

  const accessToken = jwt.sign(
    {
      sub: user.id,
      roleCode: user.role_code,
      email: user.email
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"] }
  );

  return {
    accessToken,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      roleCode: user.role_code
    }
  };
};

const getMe = async (userId: number) => {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new AppError("AUTH_USER_NOT_FOUND");
  }

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    roleCode: user.role_code
  };
};

const updateMe = async (userId: number, payload: UpdateProfileInput) => {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new AppError("AUTH_USER_NOT_FOUND");
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedPhone = payload.phone.trim();
  const normalizedName = payload.fullName.trim();

  if (normalizedEmail !== user.email) {
    const existingByEmail = await authRepository.findUserByEmail(normalizedEmail);
    if (existingByEmail) {
      throw new AppError("AUTH_EMAIL_TAKEN");
    }
  }

  if (normalizedPhone !== user.phone) {
    const existingByPhone = await authRepository.findUserByPhone(normalizedPhone);
    if (existingByPhone) {
      throw new AppError("AUTH_PHONE_TAKEN");
    }
  }

  await authRepository.updateProfile({
    userId,
    fullName: normalizedName,
    email: normalizedEmail,
    phone: normalizedPhone
  });

  return getMe(userId);
};

const changeMyPassword = async (userId: number, payload: ChangePasswordInput) => {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new AppError("AUTH_USER_NOT_FOUND");
  }

  const isCurrentPasswordValid = await bcrypt.compare(payload.currentPassword, user.password_hash);
  if (!isCurrentPasswordValid) {
    throw new AppError("AUTH_CURRENT_PASSWORD_INVALID");
  }

  const newPasswordHash = await bcrypt.hash(payload.newPassword, 10);
  await authRepository.updatePasswordHash(userId, newPasswordHash);
};

const createAdmin = async (payload: CreateAdminInput) => {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedPhone = payload.phone.trim();

  const existingByEmail = await authRepository.findUserByEmail(normalizedEmail);
  if (existingByEmail) {
    throw new AppError("AUTH_EMAIL_TAKEN");
  }

  const existingByPhone = await authRepository.findUserByPhone(normalizedPhone);
  if (existingByPhone) {
    throw new AppError("AUTH_PHONE_TAKEN");
  }

  const adminRole = await authRepository.findRoleByCode(ROLE_CODES.ADMIN);
  if (!adminRole) {
    throw new AppError("AUTH_ROLE_NOT_CONFIGURED", { message: "Admin role is not configured" });
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const userId = await authRepository.createUser({
    roleId: adminRole.id,
    fullName: payload.fullName.trim(),
    email: normalizedEmail,
    phone: normalizedPhone,
    passwordHash
  });

  return { userId };
};

export const authService = {
  register,
  login,
  getMe,
  updateMe,
  changeMyPassword,
  createAdmin
};
