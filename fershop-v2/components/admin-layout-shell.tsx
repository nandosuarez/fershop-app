"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import type { SessionData } from "@/lib/auth-types";

const navigation = [
  { href: "/admin", label: "Inicio", icon: "home" },
  { href: "/admin/pedidos", label: "Pedidos", icon: "orders" },
  { href: "/admin/productos", label: "Productos", icon: "products" },
  { href: "/admin/calculadora", label: "Calculadora", icon: "calculator" },
  { href: "/admin/clientes", label: "Clientes", icon: "customers" },
  { href: "/admin/gastos", label: "Gastos", icon: "expenses" },
  { href: "/admin/informes", label: "Informes", icon: "reports" },
  { href: "/admin/usuarios", label: "Usuarios", icon: "users" },
] as const;

function NavigationIcon({ name }: { name: (typeof navigation)[number]["icon"] }) {
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 10.8 12 3l9 7.8v9.1a1.1 1.1 0 0 1-1.1 1.1H4.1A1.1 1.1 0 0 1 3 19.9Z" />
        <path d="M9 21v-7h6v7" />
      </svg>
    );
  }

  if (name === "orders") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h12l2 4v14H4V7Z" />
        <path d="M4 7h16M9 11h6" />
      </svg>
    );
  }

  if (name === "products") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m4 8 8-5 8 5-8 5Z" />
        <path d="m4 8 8 5 8-5v8l-8 5-8-5Z" />
      </svg>
    );
  }

  if (name === "expenses") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 3h14v18l-3-2-4 2-4-2-3 2Z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }

  if (name === "calculator") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="2.5" width="14" height="19" rx="2" />
        <path d="M8 6h8v4H8ZM8 14h1M12 14h1M16 14h1M8 18h1M12 18h1M16 18h1" />
      </svg>
    );
  }

  if (name === "reports") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c.5-3.7 2.5-5.6 6-5.6s5.5 1.9 6 5.6M16 5.5a3 3 0 0 1 0 5.8M17 14.7c2.3.7 3.6 2.5 4 5.3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.8-4.4 3.5-6.5 8-6.5s7.2 2.1 8 6.5" />
    </svg>
  );
}

export function AdminLayoutShell({
  children,
  session,
}: {
  children: ReactNode;
  session: SessionData;
}) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const canManageUsers = session.role === "SUPERADMIN" || session.role === "ADMIN";

  function isCurrent(href: string) {
    if (href === "/admin") {
      return pathname === href;
    }
    if (href === "/admin/pedidos") {
      return pathname.startsWith("/admin/pedidos") || pathname.startsWith("/admin/nuevo-pedido");
    }
    if (href === "/admin/productos") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="ops-layout">
      <header className="ops-mobile-header">
        <Link href="/admin" className="ops-brand" aria-label="FerShop operacion">
          <Image
            src="/brand/fershop-logo-light.png"
            alt="FerShop USA"
            width={2082}
            height={756}
            className="ops-brand__logo"
            priority
          />
        </Link>
        <button
          type="button"
          className="ops-menu-toggle"
          aria-label="Abrir menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <aside className={isMenuOpen ? "ops-sidebar is-open" : "ops-sidebar"}>
        <Link href="/admin" className="ops-brand" aria-label="FerShop operacion">
          <Image
            src="/brand/fershop-logo-light.png"
            alt="FerShop USA"
            width={2082}
            height={756}
            className="ops-brand__logo"
            priority
          />
        </Link>

        <nav className="ops-nav" aria-label="Menu operativo">
          {navigation.filter((item) => item.icon !== "users" || canManageUsers).map((item) =>
            item.href === "/admin/productos" ? (
              <div key={item.href} className="ops-nav-group">
                <Link
                  href={item.href}
                  className={isCurrent(item.href) ? "is-current" : undefined}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <NavigationIcon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
                <div className="ops-subnav">
                  <Link
                    href="/admin/productos/inventario"
                    className={pathname.startsWith("/admin/productos/inventario") ? "is-current" : undefined}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Inventario
                  </Link>
                  <Link
                    href="/admin/productos/ordenes-compra"
                    className={pathname.startsWith("/admin/productos/ordenes-compra") ? "is-current" : undefined}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Ordenes de compra
                  </Link>
                </div>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={isCurrent(item.href) ? "is-current" : undefined}
                onClick={() => setIsMenuOpen(false)}
              >
                <NavigationIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            )
          )}
        </nav>

        <div className="ops-sidebar__footer">
          <span className="ops-avatar">
            {session.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("")}
          </span>
          <div>
            <strong>{session.name}</strong>
            <small>{session.role === "SUPERADMIN" ? "Superadministrador" : session.role.toLocaleLowerCase("es")}</small>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" aria-label="Cerrar sesion" title="Cerrar sesion">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" />
              </svg>
            </button>
          </form>
        </div>
      </aside>

      {isMenuOpen ? (
        <button
          type="button"
          className="ops-backdrop"
          aria-label="Cerrar menu"
          onClick={() => setIsMenuOpen(false)}
        />
      ) : null}

      <div className="ops-content">{children}</div>
    </div>
  );
}
