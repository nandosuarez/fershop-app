import Link from "next/link";

export default function CheckoutPage() {
  return (
    <main className="section-block">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Cierre base</p>
          <h1>Un cierre de pedido que respeta como vende FerShop.</h1>
        </div>
        <p>
          En la v2 el checkout no finge pagos que no existen. Registra el pedido, deja claros
          los montos y prepara el paso real de cobro o confirmacion por WhatsApp.
        </p>
      </div>

      <section className="checkout-grid">
        <article className="detail-card">
          <p className="section-eyebrow">Paso 1</p>
          <h2>Resumen de compra</h2>
          <ul>
            <li>Total del pedido</li>
            <li>Cobro esperado hoy</li>
            <li>Saldo cuando llegue a Colombia</li>
            <li>Items inmediatos vs por encargo</li>
          </ul>
        </article>

        <article className="detail-card">
          <p className="section-eyebrow">Paso 2</p>
          <h2>Datos de la clienta</h2>
          <ul>
            <li>Nombre</li>
            <li>WhatsApp</li>
            <li>Ciudad</li>
            <li>Notas de talla, color o entrega</li>
          </ul>
        </article>

        <article className="detail-card">
          <p className="section-eyebrow">Paso 3</p>
          <h2>Confirmacion comercial</h2>
          <ul>
            <li>Pedido creado</li>
            <li>Estado inicial</li>
            <li>Monto a cobrar hoy</li>
            <li>Seguimiento posterior del saldo</li>
          </ul>
        </article>
      </section>

      <section className="detail-card detail-card--wide">
        <p className="section-eyebrow">Proxima integracion</p>
        <h2>Canales que conectaremos despues</h2>
        <ul>
          <li>WhatsApp para cerrar pedidos y confirmar pagos</li>
          <li>Pasarela para cobrar el 100% o el 50%</li>
          <li>Seguimiento del pedido hasta llegada a Colombia</li>
          <li>Inventario y stock real para referencias inmediatas</li>
        </ul>

        <div className="hero-actions">
          <Link href="/catalogo" className="ghost-button">
            Volver al catalogo
          </Link>
          <Link href="/admin" className="primary-button">
            Ver la operacion
          </Link>
        </div>
      </section>
    </main>
  );
}
