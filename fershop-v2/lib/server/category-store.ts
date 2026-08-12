import { randomUUID } from "node:crypto";

import { readAppDocument, writeAppDocument } from "@/lib/server/document-store";
import type { Product, ProductCategoryOption } from "@/lib/types";

interface CategoryStore {
  updatedAtIso: string;
  categories: ProductCategoryOption[];
}

interface ProductStoreDocument {
  updatedAtIso: string;
  products: Product[];
}

const defaultCategories: ProductCategoryOption[] = [
  { id: "sets", label: "Sets" },
  { id: "vestidos", label: "Vestidos" },
  { id: "denim", label: "Denim" },
  { id: "accesorios", label: "Accesorios" },
];

let mutationQueue = Promise.resolve();

export class CategoryStoreError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "CategoryStoreError";
  }
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidStore(value: unknown): value is CategoryStore {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<CategoryStore>;
  return typeof candidate.updatedAtIso === "string" && Array.isArray(candidate.categories);
}

async function ensureStore(): Promise<CategoryStore> {
  const parsed = await readAppDocument<unknown>("categories");
  if (parsed) {
    if (!isValidStore(parsed)) {
      throw new CategoryStoreError("Las categorias no tienen una estructura valida.", 500);
    }
    return parsed;
  }
  const store: CategoryStore = {
    updatedAtIso: new Date().toISOString(),
    categories: cloneValue(defaultCategories),
  };
  await writeAppDocument("categories", store);
  return store;
}

function normalizeLabel(value: string) {
  const label = value.trim().replace(/\s+/g, " ");
  if (label.length < 2 || label.length > 60) {
    throw new CategoryStoreError("La categoria debe tener entre 2 y 60 caracteres.");
  }
  return label;
}

async function withMutation<T>(mutate: (store: CategoryStore) => Promise<T>): Promise<T> {
  const run = mutationQueue.then(async () => {
    const store = await ensureStore();
    const result = await mutate(store);
    store.updatedAtIso = new Date().toISOString();
    await writeAppDocument("categories", store);
    return result;
  });
  mutationQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function getProductCategories(): Promise<ProductCategoryOption[]> {
  return cloneValue((await ensureStore()).categories);
}

export async function getProductCategory(categoryId: string) {
  const categories = await getProductCategories();
  return categories.find((category) => category.id === categoryId) ?? null;
}

export async function createProductCategory(labelInput: string) {
  return withMutation(async (store) => {
    const label = normalizeLabel(labelInput);
    if (
      store.categories.some(
        (category) => category.label.toLocaleLowerCase("es") === label.toLocaleLowerCase("es")
      )
    ) {
      throw new CategoryStoreError("Ya existe una categoria con ese nombre.", 409);
    }
    const baseId = slugify(label) || `categoria-${randomUUID().slice(0, 8)}`;
    let id = baseId;
    let suffix = 2;
    while (store.categories.some((category) => category.id === id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    const category = { id, label };
    store.categories.push(category);
    return cloneValue(category);
  });
}

export async function updateProductCategory(categoryId: string, labelInput: string) {
  return withMutation(async (store) => {
    const category = store.categories.find((candidate) => candidate.id === categoryId);
    if (!category) {
      throw new CategoryStoreError("No encontramos la categoria.", 404);
    }
    const label = normalizeLabel(labelInput);
    if (
      store.categories.some(
        (candidate) =>
          candidate.id !== categoryId &&
          candidate.label.toLocaleLowerCase("es") === label.toLocaleLowerCase("es")
      )
    ) {
      throw new CategoryStoreError("Ya existe una categoria con ese nombre.", 409);
    }

    category.label = label;
    const productStore = await readAppDocument<ProductStoreDocument>("products");
    if (productStore) {
      let changed = false;
      productStore.products.forEach((product) => {
        if (product.category === categoryId) {
          product.categoryLabel = label;
          changed = true;
        }
      });
      if (changed) {
        productStore.updatedAtIso = new Date().toISOString();
        await writeAppDocument("products", productStore);
      }
    }
    return cloneValue(category);
  });
}

export async function deleteProductCategory(categoryId: string) {
  return withMutation(async (store) => {
    const index = store.categories.findIndex((category) => category.id === categoryId);
    if (index < 0) {
      throw new CategoryStoreError("No encontramos la categoria.", 404);
    }
    if (store.categories.length === 1) {
      throw new CategoryStoreError("Debe quedar al menos una categoria.");
    }
    const productStore = await readAppDocument<ProductStoreDocument>("products");
    const productCount =
      productStore?.products.filter((product) => product.category === categoryId).length ?? 0;
    if (productCount > 0) {
      throw new CategoryStoreError(
        `No puedes eliminarla porque tiene ${productCount} producto${productCount === 1 ? "" : "s"}.`,
        409
      );
    }
    store.categories.splice(index, 1);
  });
}

export function getCategoryStoreError(error: unknown) {
  if (error instanceof CategoryStoreError) {
    return { message: error.message, status: error.status };
  }
  console.error(error);
  return { message: "No pudimos guardar la categoria.", status: 500 };
}
