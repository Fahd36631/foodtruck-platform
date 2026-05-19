import { db } from "../../core/db/connection";

export type EmailVerificationRow = {
  id: number;
  email: string;
  code: string;
  expires_at: Date;
  verified: number;
  attempts: number;
  created_at: Date;
};

type InsertVerificationInput = {
  email: string;
  code: string;
  expiresAt: Date;
};

const insertVerification = async (payload: InsertVerificationInput): Promise<number> => {
  const [createdId] = await db("email_verifications").insert({
    email: payload.email,
    code: payload.code,
    expires_at: payload.expiresAt,
    verified: 0,
    attempts: 0
  });

  return Number(createdId);
};

const findLatestUnverifiedByEmailAndCode = async (email: string, code: string) => {
  return db<EmailVerificationRow>("email_verifications")
    .where({ email, code, verified: 0 })
    .orderBy("created_at", "desc")
    .first();
};

const incrementAttempts = async (verificationId: number): Promise<void> => {
  await db("email_verifications")
    .where("id", verificationId)
    .update({
      attempts: db.raw("attempts + 1")
    });
};

const deleteVerificationsByEmail = async (email: string): Promise<void> => {
  await db("email_verifications").where("email", email).del();
};

export const emailVerificationRepository = {
  insertVerification,
  findLatestUnverifiedByEmailAndCode,
  incrementAttempts,
  deleteVerificationsByEmail
};
