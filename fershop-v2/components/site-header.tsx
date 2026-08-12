import Link from "next/link";

const navigation = [
  { href: "/", label: "Inicio" },
  { href: "/catalogo", label: "Catalogo" },
  { href: "/checkout", label: "Cierre" },
  { href: "/admin", label: "Operacion" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand-lockup" aria-label="FerShop inicio">
          <span className="brand-mark">FS</span>
          <span className="brand-copy">
            <strong>FerShop</strong>
            <small>Curaduria de moda desde Miami hasta Colombia</small>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Navegacion principal">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
