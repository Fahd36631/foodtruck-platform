import { db } from "../../core/db/connection";

type CreateUserInput = {
  roleId: number;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
};

type UpdateProfileInput = {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
};

const findUserByEmail = async (email: string) => {
  return db("users as u")
    .join("roles as r", "r.id", "u.role_id")
    .select("u.id", "u.full_name", "u.email", "u.phone", "u.password_hash", "u.role_id", "r.code as role_code")
    .where("u.email", email)
    .whereNull("u.deleted_at")
    .first();
};

const findUserByPhone = async (phone: string) => {
  return db("users as u")
    .join("roles as r", "r.id", "u.role_id")
    .select("u.id", "u.full_name", "u.email", "u.phone", "u.password_hash", "u.role_id", "r.code as role_code")
    .where("u.phone", phone)
    .whereNull("u.deleted_at")
    .first();
};

const findRoleByCode = async (code: string) => {
  return db("roles").where({ code }).first();
};

const findUserById = async (userId: number) => {
  return db("users as u")
    .join("roles as r", "r.id", "u.role_id")
    .select("u.id", "u.full_name", "u.email", "u.phone", "u.password_hash", "u.role_id", "r.code as role_code")
    .where("u.id", userId)
    .whereNull("u.deleted_at")
    .first();
};

const createUser = async (payload: CreateUserInput): Promise<number> => {
  const [createdId] = await db("users").insert({
    role_id: payload.roleId,
    full_name: payload.fullName,
    email: payload.email,
    phone: payload.phone,
    password_hash: payload.passwordHash
  });

  return Number(createdId);
};

const updateProfile = async (payload: UpdateProfileInput): Promise<void> => {
  await db("users")
    .where("id", payload.userId)
    .update({
      full_name: payload.fullName,
      email: payload.email,
      phone: payload.phone
    });
};

const updatePasswordHash = async (userId: number, passwordHash: string): Promise<void> => {
  await db("users")
    .where("id", userId)
    .update({
      password_hash: passwordHash
    });
};

export const authRepository = {
  findUserById,
  findUserByEmail,
  findUserByPhone,
  findRoleByCode,
  createUser,
  updateProfile,
  updatePasswordHash
};
