import { useEffect, useState, useCallback } from "react";
import type { Subscription } from "rxjs";
import { categoryService } from "@/db/service";
import { syncService } from "@/db/sync.service";
import type { CategoryDocument } from "@/db/types";

interface UseCategoriesOptions {
  tenantId?: string;
}

interface UseCategoriesResult {
  categories: CategoryDocument[];
  isLoading: boolean;
  error: unknown | null;
}
interface UseCategoryResult {
  category: CategoryDocument | null;
  isLoading: boolean;
  error: unknown | null;
}

export function useLocalCategories(
  options: UseCategoriesOptions = {},
): UseCategoriesResult {
  const [categories, setCategories] = useState<CategoryDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  const { tenantId } = options;

  useEffect(() => {
    let sub: Subscription | undefined;
    let cancelled = false;

    (async () => {
      try {
        const observable = await categoryService.findAll$(tenantId);
        if (cancelled) return;

        sub = observable.subscribe({
          next(docs) {
            setCategories(docs.map((d) => d.toJSON() as CategoryDocument));
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
  }, [tenantId]);

  return { categories, isLoading, error };
}

export function useLocalCategory(id: string | null): UseCategoryResult {
  const [category, setCategory] = useState<CategoryDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  useEffect(() => {
    if (!id) {
      setCategory(null);
      setIsLoading(false);
      return;
    }

    let sub: Subscription | undefined;
    let cancelled = false;

    (async () => {
      try {
        const db = await import("@/db/database").then((m) => m.getDatabase());
        if (cancelled) return;

        sub = db.categories.findOne(id).$.subscribe({
          next(doc) {
            setCategory(doc ? (doc.toJSON() as CategoryDocument) : null);
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

  return { category, isLoading, error };
}

export function useCreateCategory() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const createCategory = useCallback(
    async (
      data: Omit<
        CategoryDocument,
        | "id"
        | "createdAt"
        | "updatedAt"
        | "isSynced"
        | "isLocalOnly"
        | "isDeleted"
      >,
    ): Promise<CategoryDocument | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const doc = await categoryService.create(data);
        // Optimistically push to server if online
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

  return { createCategory, isLoading, error };
}

export function useUpdateCategory() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const updateCategory = useCallback(
    async (
      id: string,
      patch: Partial<
        Omit<CategoryDocument, "id" | "createdAt" | "isSynced" | "isLocalOnly">
      >,
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        await categoryService.update(id, patch);
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

  return { updateCategory, isLoading, error };
}

export function useDeleteCategory() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await categoryService.softDelete(id);
      syncService.push().catch(console.error);
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteCategory, isLoading, error };
}
