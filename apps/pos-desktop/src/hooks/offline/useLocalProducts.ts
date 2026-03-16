import { useEffect, useState, useCallback, useRef } from "react";
import type { Subscription } from "rxjs";
import { productService, type ProductFilter } from "@/db/local-data.service";
import { syncService } from "@/db/sync.service";
import type { ProductDocument } from "@/db/types";

interface UseProductsResult {
  products: ProductDocument[];
  isLoading: boolean;
  error: unknown | null;
}

interface UseProductResult {
  product: ProductDocument | null;
  isLoading: boolean;
  error: unknown | null;
}

export function useLocalProducts(
  filter?: Omit<ProductFilter, "search">,
): UseProductsResult {
  const [products, setProducts] = useState<ProductDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  const branchId = filter?.branchId;
  const categoryId = filter?.categoryId;
  const subcategoryId = filter?.subcategoryId;

  useEffect(() => {
    let sub: Subscription | undefined;
    let cancelled = false;

    (async () => {
      try {
        const observable = await productService.findAll$({
          branchId,
          categoryId,
          subcategoryId,
        });
        if (cancelled) return;

        sub = observable.subscribe({
          next(docs) {
            setProducts(docs.map((d) => d.toJSON() as ProductDocument));
            setIsLoading(false);
          },
          error(err) {
            setError(err);
            setIsLoading(false);
          },
        });
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      sub?.unsubscribe();
    };
  }, [branchId, categoryId, subcategoryId]);

  return { products, isLoading, error };
}

export function useLocalProductsSearch(
  search: string,
  filter?: Omit<ProductFilter, "search">,
): UseProductsResult {
  const { products: all, isLoading, error } = useLocalProducts(filter);
  const [filtered, setFiltered] = useState<ProductDocument[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (!search.trim()) {
        setFiltered(all);
        return;
      }
      const q = search.toLowerCase();
      setFiltered(
        all.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.sku ?? "").toLowerCase().includes(q) ||
            (p.barcode ?? "").toLowerCase().includes(q),
        ),
      );
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, all]);

  return { products: filtered, isLoading, error };
}

export function useLocalProduct(id: string | null): UseProductResult {
  const [product, setProduct] = useState<ProductDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  useEffect(() => {
    if (!id) {
      setProduct(null);
      setIsLoading(false);
      return;
    }

    let sub: Subscription | undefined;
    let cancelled = false;

    (async () => {
      try {
        const db = await import("@/db/database").then((m) => m.getDatabase());
        if (cancelled) return;

        sub = db.products.findOne(id).$.subscribe({
          next(doc) {
            setProduct(doc ? (doc.toJSON() as ProductDocument) : null);
            setIsLoading(false);
          },
          error(err) {
            setError(err);
            setIsLoading(false);
          },
        });
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      sub?.unsubscribe();
    };
  }, [id]);

  return { product, isLoading, error };
}

export function useCreateProduct() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const createProduct = useCallback(
    async (
      data: Omit<
        ProductDocument,
        | "id"
        | "createdAt"
        | "updatedAt"
        | "isSynced"
        | "isLocalOnly"
        | "isDeleted"
      >,
    ): Promise<ProductDocument | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const doc = await productService.create(data);
        syncService.push().catch(console.error);
        return doc;
      } catch (err) {
        setError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { createProduct, isLoading, error };
}

export function useUpdateProduct() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const updateProduct = useCallback(
    async (
      id: string,
      patch: Partial<
        Omit<ProductDocument, "id" | "createdAt" | "isSynced" | "isLocalOnly">
      >,
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        await productService.update(id, patch);
        syncService.push().catch(console.error);
        return true;
      } catch (err) {
        setError(err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { updateProduct, isLoading, error };
}

export function useDeleteProduct() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await productService.softDelete(id);
      syncService.push().catch(console.error);
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteProduct, isLoading, error };
}
