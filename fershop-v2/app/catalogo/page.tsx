import { StorefrontShell } from "@/components/storefront-shell";
import { products } from "@/lib/catalog";

export default function CatalogPage() {
  return (
    <main className="section-block">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Catalogo</p>
          <h1>Piezas curadas con una logica comercial entendible para clienta y equipo.</h1>
        </div>
        <p>
          Aqui la tienda ya habla con dos realidades: productos listos para despacho y referencias
          que se trabajan con anticipo 50/50.
        </p>
      </div>

      <StorefrontShell products={products} compact />
    </main>
  );
}
