import { ProductsWorkbench } from "@/components/products-workbench";
import { getProducts } from "@/lib/server/product-store";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  return <ProductsWorkbench initialProducts={await getProducts()} />;
}
