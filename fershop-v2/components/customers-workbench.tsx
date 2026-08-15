"use client";

import { useMemo, useState } from "react";

import { ListSearch } from "@/components/list-search";
import { matchesSearch } from "@/lib/search";
import type { Customer } from "@/lib/types";

interface CustomersWorkbenchProps {
  initialCustomers: Customer[];
}

interface ApiErrorPayload {
  message?: string;
}

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export function CustomersWorkbench({ initialCustomers }: CustomersWorkbenchProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [department, setDepartment] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Colombia");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const editingCustomer = editingCustomerId
    ? customers.find((customer) => customer.id === editingCustomerId) ?? null
    : null;
  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) =>
        matchesSearch(search, [
          customer.fullName,
          customer.email,
          customer.phone,
          customer.address,
          customer.city,
          customer.department,
          customer.postalCode,
        ])
      ),
    [customers, search]
  );

  function resetForm() {
    setFullName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setCity("");
    setDepartment("");
    setPostalCode("");
    setCountry("Colombia");
    setError(null);
  }

  function openCreateModal() {
    setEditingCustomerId(null);
    resetForm();
    setIsModalOpen(true);
  }

  function openEditModal(customer: Customer) {
    setEditingCustomerId(customer.id);
    setFullName(customer.fullName);
    setEmail(customer.email);
    setPhone(customer.phone);
    setAddress(customer.address);
    setCity(customer.city);
    setDepartment(customer.department);
    setPostalCode(customer.postalCode ?? "");
    setCountry(customer.country);
    setError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (!isSaving) {
      setIsModalOpen(false);
      setEditingCustomerId(null);
      setError(null);
    }
  }

  async function handleSubmit() {
    if (!fullName.trim()) {
      setError("Escribe el nombre del cliente.");
      return;
    }
    if (!phone.trim()) {
      setError("Escribe el telefono del cliente.");
      return;
    }
    if (!address.trim() || !city.trim() || !department.trim()) {
      setError("Completa la direccion, ciudad y departamento.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(
        editingCustomerId
          ? `/api/customers/${encodeURIComponent(editingCustomerId)}`
          : "/api/customers",
        {
          method: editingCustomerId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            email,
            phone,
            address,
            city,
            department,
            postalCode,
            country,
          }),
        }
      );
      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorPayload;
        throw new Error(payload.message || "No pudimos guardar el cliente.");
      }

      const payload = (await response.json()) as { customer: Customer };
      const wasEditing = Boolean(editingCustomerId);
      setCustomers((current) =>
        editingCustomerId
          ? current.map((customer) =>
              customer.id === payload.customer.id ? payload.customer : customer
            )
          : [payload.customer, ...current]
      );
      setFeedback(
        `${payload.customer.fullName} fue ${wasEditing ? "actualizado" : "agregado"} correctamente.`
      );
      setIsModalOpen(false);
      setEditingCustomerId(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "No pudimos guardar el cliente.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <main className="ops-page">
        <div className="ops-page-header">
          <div>
            <p className="ops-kicker">{customers.length} clientes</p>
            <h1>Clientes</h1>
          </div>
          <button type="button" className="ops-button ops-button--primary" onClick={openCreateModal}>
            <span aria-hidden="true">+</span> Agregar cliente
          </button>
        </div>

        {feedback ? (
          <p className="ops-success-notice" role="status">
            {feedback}
          </p>
        ) : null}

        <section className="ops-card ops-table-card">
          <ListSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar cliente, telefono o ciudad"
            resultLabel={`${filteredCustomers.length} resultado${filteredCustomers.length === 1 ? "" : "s"}`}
          />
          {filteredCustomers.length ? <div className="ops-table-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Ciudad</th>
                  <th>Direccion</th>
                  <th><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="ops-customer-cell">
                        <span className="ops-avatar">{getInitials(customer.fullName)}</span>
                        <strong>{customer.fullName}</strong>
                      </div>
                    </td>
                    <td>
                      <span>{customer.email || "Sin correo"}</span>
                      <small>{customer.phone}</small>
                    </td>
                    <td>{customer.city}, {customer.department}</td>
                    <td>{customer.address}</td>
                    <td>
                      <div className="product-row-actions">
                        <button type="button" onClick={() => openEditModal(customer)}>
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div> : (
            <div className="ops-empty-state">
              <h2>No encontramos clientes</h2>
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
            className="order-modal customer-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-form-title"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="order-modal__header">
              <h2 id="customer-form-title">
                {editingCustomer ? "Editar cliente" : "Agregar cliente"}
              </h2>
              <button type="button" aria-label="Cerrar" onClick={closeModal}>
                &times;
              </button>
            </div>

            <div className="product-create-form">
              <label className="product-form-field product-form-field--wide">
                <span>Nombre completo</span>
                <input autoFocus value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </label>
              <label className="product-form-field">
                <span>Telefono</span>
                <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </label>
              <label className="product-form-field">
                <span>Correo</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="product-form-field product-form-field--wide">
                <span>Direccion</span>
                <input value={address} onChange={(event) => setAddress(event.target.value)} />
              </label>
              <label className="product-form-field">
                <span>Ciudad</span>
                <input value={city} onChange={(event) => setCity(event.target.value)} />
              </label>
              <label className="product-form-field">
                <span>Departamento</span>
                <input value={department} onChange={(event) => setDepartment(event.target.value)} />
              </label>
              <label className="product-form-field">
                <span>Codigo postal</span>
                <input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} />
              </label>
              <label className="product-form-field">
                <span>Pais</span>
                <input value={country} onChange={(event) => setCountry(event.target.value)} />
              </label>
              {error ? (
                <p className="order-form-error product-form-field--wide" role="alert">{error}</p>
              ) : null}
            </div>

            <div className="order-modal__footer">
              <span />
              <div>
                <button type="button" className="ops-button" disabled={isSaving} onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="ops-button ops-button--primary" disabled={isSaving}>
                  {isSaving ? "Guardando..." : editingCustomer ? "Guardar cambios" : "Guardar cliente"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
