import Link from "next/link";

import { StorefrontShell } from "@/components/storefront-shell";
import { products } from "@/lib/catalog";
import { formatCop } from "@/lib/commerce";

const featuredProducts = products.filter((product) => product.featured);

export default function HomePage() {
  return (
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="section-eyebrow">FerShop v2</p>
          <h1>Primero ordenamos la operacion. Despues escalamos la tienda.</h1>
          <p>
            Esta nueva base arranca por donde mas duele el negocio: registrar pedidos,
            controlar anticipos, avisar compras, cobrar saldos y cerrar entregas sin perder trazabilidad.
          </p>

          <div className="hero-actions">
            <Link href="/admin" className="primary-button">
              Entrar al centro operativo
            </Link>
            <Link href="/catalogo" className="ghost-button">
              Ver tienda base
            </Link>
          </div>

          <dl className="hero-metrics">
            <div>
              <dt>Prioridad</dt>
              <dd>Pedido, pagos, mensajes y entrega</dd>
            </div>
            <div>
              <dt>Logica de cobro</dt>
              <dd>100% hoy o 50/50 segun el caso</dd>
            </div>
            <div>
              <dt>Promesa</dt>
              <dd>Premium, clara y lista para escalar</dd>
            </div>
          </dl>
        </div>

        <div className="hero-stage">
          <article className="hero-stage__card">
            <span>Pedido recibido</span>
            <strong>Anticipo claro y compra trazada</strong>
            <p>La operacion sabe cuanto entra hoy y cuando ya puede comprar en origen.</p>
          </article>
          <article className="hero-stage__card">
            <span>Despues de la llegada</span>
            <strong>Segundo pago, entrega y cierre</strong>
            <p>El sistema prepara el mensaje correcto para cobrar saldo y luego cerrar el pedido.</p>
          </article>
        </div>
      </section>

      <section className="editorial-strip">
        {featuredProducts.map((product) => (
          <article key={product.id} className="editorial-card">
            <span>{product.categoryLabel}</span>
            <h2>{product.name}</h2>
            <p>{product.story}</p>
          </article>
        ))}
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Tienda base en espanol</p>
            <h2>La tienda queda viva, pero ya alineada al flujo real de FerShop</h2>
          </div>
          <p>
            El carrito ya separa lo que se cobra hoy frente al saldo cuando llegue a Colombia,
            que es una de las piezas mas importantes del modelo comercial.
          </p>
        </div>

        <StorefrontShell products={products} />
      </section>
    </main>
  );
}
