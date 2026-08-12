export type UserRole = "SUPERADMIN" | "ADMIN" | "OPERACION" | "VENTAS";

export interface SessionData {
  email: string;
  expiresAt: number;
  name: string;
  role: UserRole;
  userId: string;
  username: string;
}

export interface UserView {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAtIso?: string;
  createdAtIso: string;
  updatedAtIso: string;
}
