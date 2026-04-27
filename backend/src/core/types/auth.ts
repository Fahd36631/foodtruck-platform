import type { JwtPayload } from "jsonwebtoken";

export type AuthUser = {
  userId: number;
  roleCode: string;
  email: string;
};

export type AccessTokenPayload = JwtPayload & {
  sub: string;
  roleCode: string;
  email: string;
};
