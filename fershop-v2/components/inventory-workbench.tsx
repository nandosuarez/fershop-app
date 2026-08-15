"use client";

import { useMemo, useState } from "react";

import { ListSearch } from "@/components/list-search";
import { formatCop } from "@/lib/commerce";
import { matchesSearch } from "@/lib/search";
import type { InventorySnapshot } from "@/lib/types";

interface InventoryWorkbenchProps {
  snapshot: InventorySnapshot;
}

function formatMovementDate(iso?: string) {
  if (!iso) {
    return "Sin movimientos";
  }
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

export function InventoryWorkbench({ snapshot }: InventoryWorkbenchProps) {
  const [search, setSearch] = useState("");
  const productsById = useMemo(
    () => new Map(snapshot.items.map((item) => [item.product.id, item.product])),
    [snapshot.items]
  );
  const filteredItems = useMemo(
    () =>
      snapshot.items.filter((item) =>
        matchesSearch(search, [
          item.product.name,
          item.product.categoryLabel,
          item.availableQuantity > 0 ? "disponible" : "sin existencias",
          item.availableQuantity,
          item.lastMovement?.referenceLabel,
        ])
      ),
    [search, snapshot.items]
  );
  const filteredMovements = useMemo(
    () =>
      snapshot.movements.filter((movement) =>
        matchesSearch(search, [
          productsById.get(movement.productId)?.name,
          movement.referenceLabel,
          formatMovementDate(movement.createdAtIso),
          movement.quantity,
        ])
      ),
    [productsById, search, snapshot.movements]
  );

  return (
    <main className="ops-page">
      <div className="ops-page-header">
        <div>
          <p className="ops-kicker">{snapshot.totalAvailableUnits} unidades disponibles</p>
          <h1>Inventario</h1>
        </div>
      </div>

      <div className="inventory-summary-grid">
        <section className="ops-card inventory-summary-card">
          <span>Existencias disponibles</span>
          <strong>{snapshot.totalAvailableUnits}</strong>
        </section>
        <section className="ops-card inventory-summary-card">
          <span>Valor del inventario</span>
          <strong>{formatCop(snapshot.totalInventoryValueCop)}</strong>
        </section>
      </div>

      <section className="ops-card ops-table-card">
        <ListSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar producto o movimiento"
          resultLabel={`${filteredItems.length} producto${filteredItems.length === 1 ? "" : "s"}`}
        />
        {filteredItems.length ? (
          <div className="ops-table-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Disponibles</th>
                  <th>Entradas</th>
                  <th>Salidas</th>
                  <th>Estado</th>
                  <th>Ultimo movimiento</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.product.id}>
                    <td>
                      <div className="ops-product-cell">
                        <span className="ops-product-thumb">
                          {item.product.imageUrl ? (
                            <img src={item.product.imageUrl} alt="" />
                          ) : (
                            item.product.name.slice(0, 2).toUpperCase()
                          )}
                        </span>
                        <div>
                          <strong>{item.product.name}</strong>
                          <small>{item.product.categoryLabel}</small>
                        </div>
                      </div>
                    </td>
                    <td><strong className="inventory-quantity">{item.availableQuantity}</strong></td>
                    <td>{item.totalEntries}</td>
                    <td>{item.totalExits}</td>
                    <td>
                      <span className={item.availableQuantity > 0 ? "inventory-badge is-available" : "inventory-badge"}>
                        {item.availableQuantity > 0 ? "Disponible" : "Sin existencias"}
                      </span>
                    </td>
                    <td>
                      <span>{item.lastMovement?.referenceLabel ?? "Sin movimientos"}</span>
                      <small>{formatMovementDate(item.lastMovement?.createdAtIso)}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ops-empty-state">
            <strong>No encontramos productos</strong>
            <button type="button" className="ops-button" onClick={() => setSearch("")}>
              Limpiar busqueda
            </button>
          </div>
        )}
      </section>

      <section className="ops-card ops-table-card inventory-movements">
        <div className="ops-card__header">
          <h2>Movimientos recientes</h2>
        </div>
        {filteredMovements.length ? (
          <div className="ops-table-scroll">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Movimiento</th>
                  <th>Entrada</th>
                  <th>Salida</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{formatMovementDate(movement.createdAtIso)}</td>
                    <td>{productsById.get(movement.productId)?.name ?? "Producto"}</td>
                    <td>{movement.referenceLabel}</td>
                    <td>{movement.quantity > 0 ? movement.quantity : "-"}</td>
                    <td>{movement.quantity < 0 ? Math.abs(movement.quantity) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ops-empty-state inventory-empty-movements">
            <strong>{search ? "No encontramos movimientos" : "Sin movimientos"}</strong>
          </div>
        )}
      </section>
    </main>
  );
}
