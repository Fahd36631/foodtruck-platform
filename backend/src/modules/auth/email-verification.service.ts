import crypto from "node:crypto";

import { resendEmailService } from "../../core/email/resend-email.service";
import { AppError } from "../../core/errors";
import { logger } from "../../core/logger/logger";
import { authRepository } from "./auth.repository";
import type { ResendCodeInput, VerifyEmailInput } from "./auth.validator";
import { emailVerificationRepository } from "./email-verification.repository";

const VERIFICATION_CODE_LENGTH = 6;
const VERIFICATION_EXPIRY_MINUTES = 10;
const MAX_VERIFICATION_ATTEMPTS = 5;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const generateVerificationCode = (): string => {
  return String(crypto.randomInt(0, 10 ** VERIFICATION_CODE_LENGTH)).padStart(VERIFICATION_CODE_LENGTH, "0");
};

const buildExpiresAt = (): Date => {
  return new Date(Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000);
};

const issueAndSendCode = async (email: string): Promise<void> => {
  const normalizedEmail = normalizeEmail(email);
  const code = generateVerificationCode();
  const expiresAt = buildExpiresAt();

  await emailVerificationRepository.insertVerification({
    email: normalizedEmail,
    code,
    expiresAt
  });

  try {
    await resendEmailService.sendVerificationCode(normalizedEmail, code);
  } catch (error) {
    logger.error({ error, email: normalizedEmail }, "Verification email delivery failed");
    throw new AppError("AUTH_EMAIL_SEND_FAILED");
  }
};

const verifyEmail = async (payload: VerifyEmailInput) => {
  const normalizedEmail = normalizeEmail(payload.email);
  const code = payload.code.trim();

  const user = await authRepository.findUserByEmail(normalizedEmail);
  if (!user) {
    throw new AppError("AUTH_VERIFICATION_CODE_INVALID");
  }

  if (user.is_verified === 1) {
    throw new AppError("AUTH_EMAIL_ALREADY_VERIFIED");
  }

  const verification = await emailVerificationRepository.findLatestUnverifiedByEmailAndCode(
    normalizedEmail,
    code
  );

  if (!verification) {
    throw new AppError("AUTH_VERIFICATION_CODE_INVALID");
  }

  if (verification.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    throw new AppError("AUTH_VERIFICATION_TOO_MANY_ATTEMPTS");
  }

  const expiresAt = new Date(verification.expires_at);
  if (expiresAt.getTime() <= Date.now()) {
    throw new AppError("AUTH_VERIFICATION_CODE_EXPIRED");
  }

  const storedCode = String(verification.code).trim();
  if (storedCode !== code) {
    await emailVerificationRepository.incrementAttempts(verification.id);
    throw new AppError("AUTH_VERIFICATION_CODE_INVALID");
  }

  await authRepository.markEmailVerified(normalizedEmail);
  await emailVerificationRepository.deleteVerificationsByEmail(normalizedEmail);

  return { email: normalizedEmail, isEmailVerified: true };
};

const resendCode = async (payload: ResendCodeInput) => {
  const normalizedEmail = normalizeEmail(payload.email);

  const user = await authRepository.findUserByEmail(normalizedEmail);
  if (!user) {
    throw new AppError("AUTH_USER_NOT_FOUND");
  }

  if (user.is_verified === 1) {
    throw new AppError("AUTH_EMAIL_ALREADY_VERIFIED");
  }

  await issueAndSendCode(normalizedEmail);

  return { email: normalizedEmail };
};

export const emailVerificationService = {
  issueAndSendCode,
  verifyEmail,
  resendCode
};
