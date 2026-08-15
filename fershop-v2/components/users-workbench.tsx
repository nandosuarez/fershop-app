"use client";

import { useMemo, useState } from "react";

import { ListSearch } from "@/components/list-search";
import { matchesSearch } from "@/lib/search";
import type { UserRole, UserView } from "@/lib/auth-types";

interface UsersWorkbenchProps {
  initialUsers: UserView[];
  currentUserId: string;
}

const roleLabels: Record<UserRole, string> = {
  SUPERADMIN: "Superadministrador",
  ADMIN: "Administrador",
  OPERACION: "Operacion",
  VENTAS: "Ventas",
};

function formatDate(iso?: string) {
  if (!iso) return "Nunca";
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

export function UsersWorkbench({ initialUsers, currentUserId }: UsersWorkbenchProps) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("OPERACION");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const editingUser = users.find((user) => user.id === editingUserId) ?? null;
  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        matchesSearch(search, [
          user.name,
          user.email,
          user.username,
          roleLabels[user.role],
          user.isActive ? "activo" : "inactivo",
        ])
      ),
    [search, users]
  );

  function resetForm() {
    setName("");
    setEmail("");
    setUsername("");
    setPassword("");
    setRole("OPERACION");
    setIsActive(true);
    setError(null);
  }

  function openCreateModal() {
    setEditingUserId(null);
    resetForm();
    setIsModalOpen(true);
  }

  function openEditModal(user: UserView) {
    setEditingUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setUsername(user.username);
    setPassword("");
    setRole(user.role);
    setIsActive(user.isActive);
    setError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (!isSaving) {
      setIsModalOpen(false);
      setEditingUserId(null);
      setError(null);
    }
  }

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !username.trim()) {
      setError("Completa nombre, correo y usuario.");
      return;
    }
    if (!editingUserId && password.length < 10) {
      setError("La clave temporal debe tener al menos 10 caracteres.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(
        editingUserId ? `/api/users/${encodeURIComponent(editingUserId)}` : "/api/users",
        {
          method: editingUserId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, username, password, role, isActive }),
        }
      );
      const payload = (await response.json()) as { user?: UserView; message?: string };
      if (!response.ok || !payload.user) {
        throw new Error(payload.message || "No pudimos guardar el usuario.");
      }
      setUsers((current) =>
        editingUserId
          ? current.map((user) => (user.id === payload.user!.id ? payload.user! : user))
          : [...current, payload.user!].sort((left, right) => left.name.localeCompare(right.name))
      );
      setFeedback(`Usuario ${payload.user.username} guardado correctamente.`);
      setIsModalOpen(false);
      setEditingUserId(null);
      resetForm();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No pudimos guardar el usuario.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <main className="ops-page">
        <div className="ops-page-header">
          <div>
            <p className="ops-kicker">Accesos y permisos</p>
            <h1>Usuarios</h1>
          </div>
          <div className="users-page-actions">
            <a href="/api/backup/export" className="ops-button">Descargar backup</a>
            <button type="button" className="ops-button ops-button--primary" onClick={openCreateModal}>
              <span aria-hidden="true">+</span> Agregar usuario
            </button>
          </div>
        </div>

        {feedback ? <p className="ops-success-notice" role="status">{feedback}</p> : null}

        <section className="ops-card backup-status-card">
          <div>
            <span>Copias de seguridad</span>
            <strong>PostgreSQL + respaldo operativo</strong>
          </div>
          <small>Render conserva recuperacion continua en la base pagada. El archivo JSON contiene toda la operacion y las imagenes.</small>
        </section>

        <section className="ops-card ops-table-card">
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar usuario, correo o rol"
            resultLabel={`${filteredUsers.length} resultado${filteredUsers.length === 1 ? "" : "s"}`}
          />
          {filteredUsers.length ? <div className="ops-table-scroll">
            <table className="ops-table users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Ultimo acceso</th>
                  <th><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <small>@{user.username}{user.id === currentUserId ? " · Tu cuenta" : ""}</small>
                    </td>
                    <td>{user.email}</td>
                    <td>{roleLabels[user.role]}</td>
                    <td><span className={`user-state ${user.isActive ? "is-active" : "is-inactive"}`}>{user.isActive ? "Activo" : "Inactivo"}</span></td>
                    <td>{formatDate(user.lastLoginAtIso)}</td>
                    <td>
                      <div className="product-row-actions">
                        <button type="button" onClick={() => openEditModal(user)}>Editar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div> : (
            <div className="ops-empty-state">
              <h2>No encontramos usuarios</h2>
              <button type="button" className="ops-button" onClick={() => setSearch("")}>
                Limpiar busqueda
              </button>
            </div>
          )}
        </section>
      </main>

      {isModalOpen ? (
        <div className="order-modal-backdrop" role="presentation">
          <form
            className="order-modal user-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-form-title"
            onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}
          >
            <div className="order-modal__header">
              <h2 id="user-form-title">{editingUser ? "Editar usuario" : "Agregar usuario"}</h2>
              <button type="button" aria-label="Cerrar" onClick={closeModal}>&times;</button>
            </div>
            <div className="product-create-form">
              <label className="product-form-field product-form-field--wide">
                <span>Nombre</span>
                <input autoFocus value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="product-form-field">
                <span>Usuario</span>
                <input value={username} onChange={(event) => setUsername(event.target.value)} />
              </label>
              <label className="product-form-field">
                <span>Correo</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="product-form-field">
                <span>Rol</span>
                <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                  <option value="ADMIN">Administrador</option>
                  <option value="OPERACION">Operacion</option>
                  <option value="VENTAS">Ventas</option>
                  {editingUser?.role === "SUPERADMIN" ? <option value="SUPERADMIN">Superadministrador</option> : null}
                </select>
              </label>
              <label className="product-form-field">
                <span>{editingUser ? "Nueva clave (opcional)" : "Clave temporal"}</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
              {editingUser ? (
                <label className="user-active-field product-form-field--wide">
                  <input
                    type="checkbox"
                    checked={isActive}
                    disabled={editingUser.id === currentUserId}
                    onChange={(event) => setIsActive(event.target.checked)}
                  />
                  <span>Usuario activo</span>
                </label>
              ) : null}
              {error ? <p className="order-form-error product-form-field--wide" role="alert">{error}</p> : null}
            </div>
            <div className="order-modal__footer">
              <span />
              <div>
                <button type="button" className="ops-button" disabled={isSaving} onClick={closeModal}>Cancelar</button>
                <button type="submit" className="ops-button ops-button--primary" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar usuario"}</button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
