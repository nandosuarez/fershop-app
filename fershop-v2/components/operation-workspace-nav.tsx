import Link from "next/link";

interface OperationWorkspaceNavProps {
  current: "dashboard" | "new-order" | "tracking";
}

const items = [
  { key: "dashboard", href: "/admin", label: "Resumen operativo" },
  { key: "new-order", href: "/admin/nuevo-pedido", label: "Nuevo pedido" },
  { key: "tracking", href: "/admin/seguimiento", label: "Seguimiento" },
] as const;

export function OperationWorkspaceNav({ current }: OperationWorkspaceNavProps) {
  return (
    <div className="workspace-nav">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={current === item.key ? "workspace-nav__item is-active" : "workspace-nav__item"}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
