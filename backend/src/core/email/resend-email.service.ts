import { Resend } from "resend";

import { env } from "../../config/env";
import { logger } from "../logger/logger";

const resendClient = new Resend(env.RESEND_API_KEY);

const buildVerificationEmailHtml = (code: string) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
    <h2 style="margin: 0 0 12px;">Verify your email</h2>
    <p style="margin: 0 0 16px;">Use the code below to verify your Food Truck Platform account. It expires in 10 minutes.</p>
    <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 0 0 16px;">${code}</p>
    <p style="margin: 0; color: #555; font-size: 14px;">If you did not create an account, you can ignore this email.</p>
  </div>
`;

const sendVerificationCode = async (email: string, code: string): Promise<void> => {
  const { error } = await resendClient.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: email,
    subject: "Your email verification code",
    html: buildVerificationEmailHtml(code)
  });

  if (error) {
    logger.error({ error, email }, "Failed to send verification email via Resend");
    throw error;
  }
};

export const resendEmailService = {
  sendVerificationCode
};
