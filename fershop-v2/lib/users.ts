import type { SessionData, UserRole, UserView } from "@/lib/auth-types";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";

interface UserRow {
  id: string;
  name: string;
  email: string;
  username: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AuthUser extends UserView {
  passwordHash: string;
}

export interface SaveUserInput {
  name: string;
  email: string;
  username: string;
  role: UserRole;
  isActive?: boolean;
  password?: string;
}

export class UserStoreError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "UserStoreError";
  }
}

const allowedRoles: UserRole[] = ["SUPERADMIN", "ADMIN", "OPERACION", "VENTAS"];

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toUserView(row: UserRow): UserView {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username,
    role: row.role,
    isActive: row.is_active,
    lastLoginAtIso: row.last_login_at ? iso(row.last_login_at) : undefined,
    createdAtIso: iso(row.created_at),
    updatedAtIso: iso(row.updated_at),
  };
}

function normalizeInput(input: SaveUserInput) {
  const role = String(input.role).toLocaleUpperCase("es-CO") as UserRole;
  const normalized = {
    name: input.name.trim(),
    email: input.email.trim().toLocaleLowerCase("es-CO"),
    username: input.username.trim().toLocaleLowerCase("es-CO"),
    role,
    isActive: input.isActive ?? true,
    password: input.password?.trim() || undefined,
  };
  if (normalized.name.length < 2) {
    throw new UserStoreError("Escribe el nombre del usuario.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    throw new UserStoreError("Escribe un correo valido.");
  }
  if (!/^[a-z0-9._-]{3,40}$/.test(normalized.username)) {
    throw new UserStoreError("El usuario debe tener entre 3 y 40 caracteres sin espacios.");
  }
  if (!allowedRoles.includes(normalized.role)) {
    throw new UserStoreError("Selecciona un rol valido.");
  }
  if (normalized.password && normalized.password.length < 10) {
    throw new UserStoreError("La clave debe tener al menos 10 caracteres.");
  }
  return normalized;
}

function handleDatabaseError(error: unknown): never {
  const pgError = error as { code?: string };
  if (pgError.code === "23505") {
    throw new UserStoreError("Ya existe un usuario con ese correo o nombre de acceso.", 409);
  }
  throw error;
}

export async function findUserByLogin(login: string): Promise<AuthUser | null> {
  const result = await getDb().query<UserRow>(
    `
      SELECT * FROM fershop_v2.app_user
      WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [login.trim()]
  );
  if (!result.rowCount) {
    return null;
  }
  const row = result.rows[0];
  return { ...toUserView(row), passwordHash: row.password_hash };
}

export async function listUsers(): Promise<UserView[]> {
  const result = await getDb().query<UserRow>(
    `SELECT * FROM fershop_v2.app_user ORDER BY is_active DESC, name ASC`
  );
  return result.rows.map(toUserView);
}

export async function createUser(input: SaveUserInput): Promise<UserView> {
  const normalized = normalizeInput(input);
  if (!normalized.password) {
    throw new UserStoreError("Escribe una clave temporal para el usuario.");
  }
  try {
    const result = await getDb().query<UserRow>(
      `
        INSERT INTO fershop_v2.app_user
          (name, email, username, password_hash, role, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        normalized.name,
        normalized.email,
        normalized.username,
        await hashPassword(normalized.password),
        normalized.role,
        normalized.isActive,
      ]
    );
    return toUserView(result.rows[0]);
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function updateUser(
  userId: string,
  input: SaveUserInput,
  actor: SessionData
): Promise<UserView> {
  const normalized = normalizeInput(input);
  const current = await getDb().query<UserRow>(
    `SELECT * FROM fershop_v2.app_user WHERE id = $1 LIMIT 1`,
    [userId]
  );
  if (!current.rowCount) {
    throw new UserStoreError("No encontramos el usuario seleccionado.", 404);
  }
  const currentUser = current.rows[0];
  if (currentUser.role === "SUPERADMIN" && actor.role !== "SUPERADMIN") {
    throw new UserStoreError("Solo el superadministrador puede modificar este usuario.", 403);
  }
  if (userId === actor.userId && !normalized.isActive) {
    throw new UserStoreError("No puedes desactivar tu propio acceso.");
  }
  if (currentUser.role === "SUPERADMIN" && normalized.role !== "SUPERADMIN") {
    const count = await getDb().query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM fershop_v2.app_user WHERE role = 'SUPERADMIN' AND is_active = TRUE`
    );
    if (Number(count.rows[0].count) <= 1) {
      throw new UserStoreError("Debe quedar al menos un superadministrador activo.");
    }
  }

  try {
    const passwordHash = normalized.password
      ? await hashPassword(normalized.password)
      : currentUser.password_hash;
    const result = await getDb().query<UserRow>(
      `
        UPDATE fershop_v2.app_user
        SET name = $2, email = $3, username = $4, password_hash = $5,
            role = $6, is_active = $7
        WHERE id = $1
        RETURNING *
      `,
      [
        userId,
        normalized.name,
        normalized.email,
        normalized.username,
        passwordHash,
        normalized.role,
        normalized.isActive,
      ]
    );
    return toUserView(result.rows[0]);
  } catch (error) {
    handleDatabaseError(error);
  }
}

export async function recordSuccessfulLogin(userId: string) {
  await getDb().query(
    `UPDATE fershop_v2.app_user SET last_login_at = NOW() WHERE id = $1`,
    [userId]
  );
}

export function getUserStoreError(error: unknown) {
  if (error instanceof UserStoreError) {
    return { message: error.message, status: error.status };
  }
  console.error(error);
  return { message: "No pudimos guardar los datos del usuario.", status: 500 };
}
