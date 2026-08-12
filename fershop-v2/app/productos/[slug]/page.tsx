import Link from "next/link";
import { notFound } from "next/navigation";

import { products } from "@/lib/catalog";
import { formatCop, getPaymentPolicyLabel, getSaleModeLabel } from "@/lib/commerce";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = products.find((candidate) => candidate.slug === slug);

  if (!product) {
    notFound();
  }

  const dueToday =
    product.paymentPolicy === "full_today" ? product.priceCop : Math.round(product.priceCop * 0.5);
  const dueOnArrival = product.priceCop - dueToday;

  return (
    <main className="product-detail">
      <section className="product-detail__hero">
        <div className="product-detail__image">
          <span>{product.badge}</span>
          <strong>{product.name}</strong>
        </div>

        <div className="product-detail__copy">
          <p className="section-eyebrow">{product.categoryLabel}</p>
          <h1>{product.name}</h1>
          <p>{product.description}</p>

          <div className="detail-pills">
            <span>{getSaleModeLabel(product.saleMode)}</span>
            <span>{getPaymentPolicyLabel(product.paymentPolicy)}</span>
            <span>{product.leadTimeLabel}</span>
          </div>

          <div className="product-pricing">
            <div>
              <span>Precio</span>
              <strong>{formatCop(product.priceCop)}</strong>
            </div>
            <div>
              <span>Pagas hoy</span>
              <strong>{formatCop(dueToday)}</strong>
            </div>
            <div>
              <span>Pagas despues</span>
              <strong>{formatCop(dueOnArrival)}</strong>
            </div>
          </div>

          <article className="detail-card">
            <p className="section-eyebrow">Historia</p>
            <h2>Por que existe esta referencia</h2>
            <p>{product.story}</p>
            <p>{product.materialNote}</p>
            <p>Tallas sugeridas: {product.sizes.join(" / ")}</p>
          </article>

          <div className="hero-actions">
            <Link href="/catalogo" className="ghost-button">
              Volver al catalogo
            </Link>
            <Link href="/checkout" className="primary-button">
              Continuar al cierre
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
