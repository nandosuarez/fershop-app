import { ProductsWorkbench } from "@/components/products-workbench";
import { getProductCategories } from "@/lib/server/category-store";
import { getProducts } from "@/lib/server/product-store";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getProductCategories()]);
  return <ProductsWorkbench initialProducts={products} initialCategories={categories} />;
}
