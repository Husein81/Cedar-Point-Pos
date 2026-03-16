/**
 * useLocalSubcategories.ts
 *
 * Reactive hooks for the local `subcategories` collection.
 */

import { useEffect, useState, useCallback } from "react";
import type { Subscription } from "rxjs";
import { subcategoryService } from "@/db/local-data.service";
import { syncService } from "@/db/sync.service";
import type { SubcategoryDocument } from "@/db/types";

// ─── useLocalSubcategories ────────────────────────────────────────────────────

interface UseSubcategoriesOptions {
  categoryId?: string;
}

interface UseSubcategoriesResult {
  subcategories: SubcategoryDocument[];
  isLoading: boolean;
  error: unknown | null;
}

/**
 * Subscribe to all non-deleted subcategories, optionally filtered by categoryId.
 */
export function useLocalSubcategories(options: UseSubcategoriesOptions = {}): UseSubcategoriesResult {
  const [subcategories, setSubcategories] = useState<SubcategoryDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  const { categoryId } = options;

  useEffect(() => {
    let sub: Subscription | undefined;
    let cancelled = false;

    (async () => {
      try {
        const observable = await subcategoryService.findAll$(categoryId);
        if (cancelled) return;

        sub = observable.subscribe({
          next(docs) {
            setSubcategories(docs.map((d) => d.toJSON() as SubcategoryDocument));
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
  }, [categoryId]);

  return { subcategories, isLoading, error };
}

// ─── useLocalSubcategory ──────────────────────────────────────────────────────

interface UseSubcategoryResult {
  subcategory: SubcategoryDocument | null;
  isLoading: boolean;
  error: unknown | null;
}

export function useLocalSubcategory(id: string | null): UseSubcategoryResult {
  const [subcategory, setSubcategory] = useState<SubcategoryDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  useEffect(() => {
    if (!id) {
      setSubcategory(null);
      setIsLoading(false);
      return;
    }

    let sub: Subscription | undefined;
    let cancelled = false;

    (async () => {
      try {
        const db = await import("@/db/database").then((m) => m.getDatabase());
        if (cancelled) return;

        sub = db.subcategories.findOne(id).$.subscribe({
          next(doc) {
            setSubcategory(doc ? (doc.toJSON() as SubcategoryDocument) : null);
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

  return { subcategory, isLoading, error };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateSubcategory() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const createSubcategory = useCallback(
    async (
      data: Omit<SubcategoryDocument, "id" | "createdAt" | "updatedAt" | "isSynced" | "isLocalOnly" | "isDeleted">
    ): Promise<SubcategoryDocument | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const doc = await subcategoryService.create(data);
        syncService.push().catch(console.error);
        return doc;
      } catch (err) {
        setError(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { createSubcategory, isLoading, error };
}

export function useUpdateSubcategory() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const updateSubcategory = useCallback(
    async (
      id: string,
      patch: Partial<Omit<SubcategoryDocument, "id" | "createdAt" | "isSynced" | "isLocalOnly">>
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        await subcategoryService.update(id, patch);
        syncService.push().catch(console.error);
        return true;
      } catch (err) {
        setError(err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { updateSubcategory, isLoading, error };
}

export function useDeleteSubcategory() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const deleteSubcategory = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await subcategoryService.softDelete(id);
      syncService.push().catch(console.error);
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { deleteSubcategory, isLoading, error };
}
