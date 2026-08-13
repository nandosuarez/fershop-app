import { randomUUID } from "node:crypto";

import { products as seedProducts } from "@/lib/catalog";
import {
  getProductCategories,
  getProductCategory,
} from "@/lib/server/category-store";
import { readAppDocument, writeAppDocument } from "@/lib/server/document-store";
import { getInventoryBalances } from "@/lib/server/inventory-balance";
import type {
  CreateProductInput,
  Product,
  UpdateProductInput,
  UpdateProductPricingInput,
} from "@/lib/types";

interface ProductStore {
  updatedAtIso: string;
  products: Product[];
}

let mutationQueue = Promise.resolve();

export class ProductStoreError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "ProductStoreError";
  }
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildSeedStore(): ProductStore {
  return {
    updatedAtIso: new Date().toISOString(),
    products: cloneValue(seedProducts),
  };
}

function isValidStore(value: unknown): value is ProductStore {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ProductStore>;
  return typeof candidate.updatedAtIso === "string" && Array.isArray(candidate.products);
}

async function persistStore(store: ProductStore) {
  await writeAppDocument("products", store);
}

async function ensureStore(): Promise<ProductStore> {
  const parsed = await readAppDocument<unknown>("products");
  if (parsed) {
    if (!isValidStore(parsed)) {
      throw new ProductStoreError("Los datos de productos no tienen una estructura valida.", 500);
    }
    return parsed;
  }
  const store = buildSeedStore();
  await persistStore(store);
  return store;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `producto-${randomUUID().slice(0, 8)}`;
}

function uniqueSlug(name: string, products: Product[]) {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;
  while (products.some((product) => product.slug === slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

function isValidProductImageUrl(imageUrl: string) {
  return (
    /^\/uploads\/products\/[a-z0-9-]+\.(?:jpg|png|webp)$/i.test(imageUrl) ||
    /^\/api\/products\/images\/[0-9a-f-]{36}$/i.test(imageUrl)
  );
}

function setAutomaticInventoryMode(product: Product, tracksInventory: boolean) {
  product.tracksInventory = tracksInventory;
  product.saleMode = tracksInventory ? "immediate" : "preorder";
  product.paymentPolicy = tracksInventory ? "full_today" : "split_50_50";
  product.badge = "Producto";
  product.leadTimeLabel = tracksInventory
    ? "Disponible segun inventario"
    : "Pago 50/50";
}

export async function getProducts(): Promise<Product[]> {
  const [store, balances, categories] = await Promise.all([
    ensureStore(),
    getInventoryBalances(),
    getProductCategories(),
  ]);
  const categoryLabels = new Map(
    categories.map((category) => [category.id, category.label])
  );
  return cloneValue(
    store.products.map((product) => {
      const normalizedProduct = cloneValue(product);
      normalizedProduct.categoryLabel =
        categoryLabels.get(product.category) ?? product.categoryLabel;
      setAutomaticInventoryMode(
        normalizedProduct,
        (balances.get(product.id) ?? 0) > 0
      );
      return normalizedProduct;
    })
  );
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const run = mutationQueue.then(async () => {
    const store = await ensureStore();
    const category = await getProductCategory(input.category);
    const name = input.name.trim();
    const priceCop = Math.round(Number(input.priceCop));
    const costCop = Math.round(Number(input.costCop));
    const shippingCostCop = Math.round(Number(input.shippingCostCop));
    const imageUrl = input.imageUrl?.trim() || undefined;

    if (name.length < 2) {
      throw new ProductStoreError("Escribe el nombre del producto.");
    }
    if (!category) {
      throw new ProductStoreError("Selecciona una categoria valida.");
    }
    if (!Number.isFinite(priceCop) || priceCop <= 0) {
      throw new ProductStoreError("El precio de venta debe ser mayor a cero.");
    }
    if (!Number.isFinite(costCop) || costCop <= 0) {
      throw new ProductStoreError("El costo del producto debe ser mayor a cero.");
    }
    if (!Number.isFinite(shippingCostCop) || shippingCostCop < 0) {
      throw new ProductStoreError("El costo de envio no puede ser negativo.");
    }
    if (imageUrl && !isValidProductImageUrl(imageUrl)) {
      throw new ProductStoreError("La imagen del producto no es valida.");
    }
    if (
      store.products.some(
        (product) => product.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es")
      )
    ) {
      throw new ProductStoreError("Ya existe un producto con ese nombre.", 409);
    }

    const product: Product = {
      id: `product-${randomUUID()}`,
      slug: uniqueSlug(name, store.products),
      name,
      imageUrl,
      category: input.category,
      categoryLabel: category.label,
      priceCop,
      costCop,
      shippingCostCop,
      tracksInventory: false,
      saleMode: "preorder",
      paymentPolicy: "split_50_50",
      badge: "Producto",
      leadTimeLabel: "Pago 50/50",
      description: "",
      story: "",
      materialNote: "",
      sizes: [],
    };

    store.products.unshift(product);
    store.updatedAtIso = new Date().toISOString();
    await persistStore(store);
    return cloneValue(product);
  });

  mutationQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function updateProductPricing(
  productId: string,
  input: UpdateProductPricingInput
): Promise<Product> {
  const inventoryBalances = await getInventoryBalances();
  const run = mutationQueue.then(async () => {
    const store = await ensureStore();
    const product = store.products.find((candidate) => candidate.id === productId);
    if (!product) {
      throw new ProductStoreError("No encontramos el producto seleccionado.", 404);
    }

    const purchasePriceUsd = Number(input.purchasePriceUsd);
    const taxPercent = Number(input.taxPercent);
    const shippingUsd = Number(input.shippingUsd);
    const exchangeRateCop = Number(input.exchangeRateCop);
    const marginPercent = Number(input.marginPercent);
    const finalSalePriceCop = Math.round(Number(input.finalSalePriceCop));
    const numericValues = [
      purchasePriceUsd,
      taxPercent,
      shippingUsd,
      exchangeRateCop,
      marginPercent,
      finalSalePriceCop,
    ];

    if (numericValues.some((value) => !Number.isFinite(value))) {
      throw new ProductStoreError("Revisa los valores de la calculadora.");
    }
    if (purchasePriceUsd <= 0) {
      throw new ProductStoreError("El precio de compra en USD debe ser mayor a cero.");
    }
    if (taxPercent < 0 || taxPercent > 100) {
      throw new ProductStoreError("El impuesto debe estar entre 0% y 100%.");
    }
    if (shippingUsd < 0) {
      throw new ProductStoreError("El envio no puede ser negativo.");
    }
    if (exchangeRateCop <= 0) {
      throw new ProductStoreError("La TRM debe ser mayor a cero.");
    }
    if (marginPercent >= 100) {
      throw new ProductStoreError("El margen debe ser menor al 100%.");
    }
    if (finalSalePriceCop <= 0) {
      throw new ProductStoreError("El precio final debe ser mayor a cero.");
    }

    product.costCop = Math.round(
      purchasePriceUsd * (1 + taxPercent / 100) * exchangeRateCop
    );
    product.shippingCostCop = Math.round(shippingUsd * exchangeRateCop);
    product.priceCop = finalSalePriceCop;
    setAutomaticInventoryMode(
      product,
      (inventoryBalances.get(product.id) ?? 0) > 0
    );
    product.pricingCalculation = {
      purchasePriceUsd,
      taxPercent,
      shippingUsd,
      exchangeRateCop,
      marginPercent,
    };
    store.updatedAtIso = new Date().toISOString();
    await persistStore(store);
    return cloneValue(product);
  });

  mutationQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function updateProduct(
  productId: string,
  input: UpdateProductInput
): Promise<Product> {
  const inventoryBalances = await getInventoryBalances();
  const run = mutationQueue.then(async () => {
    const store = await ensureStore();
    const category = await getProductCategory(input.category);
    const product = store.products.find((candidate) => candidate.id === productId);
    if (!product) {
      throw new ProductStoreError("No encontramos el producto seleccionado.", 404);
    }

    const name = input.name.trim();
    const priceCop = Math.round(Number(input.priceCop));
    const costCop = Math.round(Number(input.costCop));
    const shippingCostCop = Math.round(Number(input.shippingCostCop));
    const imageUrl = input.imageUrl?.trim() || undefined;

    if (name.length < 2) {
      throw new ProductStoreError("Escribe el nombre del producto.");
    }
    if (!category) {
      throw new ProductStoreError("Selecciona una categoria valida.");
    }
    if (!Number.isFinite(priceCop) || priceCop <= 0) {
      throw new ProductStoreError("El precio de venta debe ser mayor a cero.");
    }
    if (!Number.isFinite(costCop) || costCop <= 0) {
      throw new ProductStoreError("El costo del producto debe ser mayor a cero.");
    }
    if (!Number.isFinite(shippingCostCop) || shippingCostCop < 0) {
      throw new ProductStoreError("El costo de envio no puede ser negativo.");
    }
    if (imageUrl && !isValidProductImageUrl(imageUrl)) {
      throw new ProductStoreError("La imagen del producto no es valida.");
    }
    if (
      store.products.some(
        (candidate) =>
          candidate.id !== productId &&
          candidate.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es")
      )
    ) {
      throw new ProductStoreError("Ya existe un producto con ese nombre.", 409);
    }

    product.name = name;
    product.imageUrl = imageUrl ?? product.imageUrl;
    product.category = input.category;
    product.categoryLabel = category.label;
    product.priceCop = priceCop;
    product.costCop = costCop;
    product.shippingCostCop = shippingCostCop;
    setAutomaticInventoryMode(
      product,
      (inventoryBalances.get(product.id) ?? 0) > 0
    );
    delete product.pricingCalculation;

    store.updatedAtIso = new Date().toISOString();
    await persistStore(store);
    return cloneValue(product);
  });

  mutationQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function getProductStoreError(error: unknown) {
  if (error instanceof ProductStoreError) {
    return { status: error.status, message: error.message };
  }
  return { status: 500, message: "No pudimos guardar el producto." };
}
