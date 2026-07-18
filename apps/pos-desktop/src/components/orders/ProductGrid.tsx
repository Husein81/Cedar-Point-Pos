import { useNetworkStatus } from "@/context/NetworkContext";
import { useCategories } from "@/hooks/useCategory";
import { useProducts } from "@/hooks/useProduct";
import { useKeypadStore } from "@/store/keypadStore";
import { useOrderStore } from "@/store/orderStore";
import type { Product } from "@repo/types";
import { Subcategory } from "@repo/types";
import {
  Button,
  Icon,
  Input,
  SButton,
  Shad,
  Skeleton,
  cn,
} from "@repo/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "./ProductCard";

export const ProductGrid = () => {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const { addItem } = useOrderStore();
  const { isOnline, lastOnlineAt } = useNetworkStatus();

  const [searchQuery, setSearchQuery] = useState("");
  const [isAvailableOnly, setIsAvailableOnly] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<
    string | null
  >(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const isLoading = productsLoading || categoriesLoading;

  // Type-to-search: any printable key focuses the search box — unless the
  // inline keypad is open (digits belong to it) or an input already has focus.
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (useKeypadStore.getState().isOpen) return;

      if (
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        searchInputRef.current?.focus();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const activeProducts = useMemo(() => {
    return (
      products?.filter((product) => {
        return product.isActive && !product.deletedAt;
      }) ?? []
    );
  }, [products]);

  const activeCategories = useMemo(() => {
    if (!categories) return [];

    const categoryIdsWithProducts = new Set(
      activeProducts.map((p) => p.categoryId).filter(Boolean),
    );

    return categories.filter(
      (category) =>
        !category.deletedAt && categoryIdsWithProducts.has(category.id),
    );
  }, [categories, activeProducts]);

  const activeSubcategories = useMemo((): Subcategory[] => {
    if (!selectedCategoryId || !categories) return [];

    const category = categories.find((c) => c.id === selectedCategoryId);

    if (!category?.subcategories) return [];

    const subcategoryIdsWithProducts = new Set(
      activeProducts
        .filter((p) => p.categoryId === selectedCategoryId)
        .map((p) => p.subcategoryId)
        .filter(Boolean),
    );

    return category.subcategories.filter(
      (subcategory) =>
        !subcategory.deletedAt &&
        subcategoryIdsWithProducts.has(subcategory.id),
    );
  }, [categories, activeProducts, selectedCategoryId]);

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((product) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();

        return (
          product.name.toLowerCase().includes(query) ||
          product.barcode?.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query)
        );
      }

      if (selectedCategoryId && product.categoryId !== selectedCategoryId) {
        return false;
      }

      if (
        selectedSubcategoryId &&
        product.subcategoryId !== selectedSubcategoryId
      ) {
        return false;
      }

      if (isAvailableOnly) {
        const totalStock =
          product.inventory?.reduce(
            (sum, inv) => Number(sum) + Number(inv.stock),
            0,
          ) ?? 0;

        if (totalStock <= 0) {
          return false;
        }
      }

      return true;
    });
  }, [
    activeProducts,
    searchQuery,
    selectedCategoryId,
    selectedSubcategoryId,
    isAvailableOnly,
  ]);

  const hasActiveFilters =
    !!searchQuery.trim() ||
    !!selectedCategoryId ||
    !!selectedSubcategoryId ||
    isAvailableOnly;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategoryId(null);
    setSelectedSubcategoryId(null);
    setIsAvailableOnly(false);
  };

  const handleProductClick = (product: Product) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      quantity: 1,
      imageUrl: product.imageUrl,
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter adds the single match (also how barcode scanners confirm)
    if (
      e.key === "Enter" &&
      filteredProducts.length === 1 &&
      filteredProducts[0]
    ) {
      handleProductClick(filteredProducts[0]);
      setSearchQuery("");
    }

    if (e.key === "Escape") {
      setSearchQuery("");
      e.currentTarget.blur();
    }
  };

  const renderProducts = () => {
    if (filteredProducts.length === 0) {
      return (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Icon
              name="PackageX"
              className="h-6 w-6 text-muted-foreground/50"
            />
          </div>
          <div>
            <p className="text-sm font-medium">No products found</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Try a different search or category.
            </p>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <Icon name="FilterX" className="mr-1.5 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-2 pb-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    );
  };

  return (
    <div className={cn("flex h-full flex-col gap-3")}>
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          />

          <Input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search name, SKU, or scan barcode…"
            aria-label="Search products"
            className="h-12 pl-10 pr-16 text-lg"
          />

          {searchQuery ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon name="X" className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-block">
              Ctrl F
            </kbd>
          )}
        </div>

        <Button
          variant={isAvailableOnly ? "default" : "outline"}
          onClick={() => setIsAvailableOnly((prev) => !prev)}
          className="h-12 whitespace-nowrap"
          aria-pressed={isAvailableOnly}
        >
          <Icon name="PackageCheck" className="mr-2 h-5 w-5" />
          <span className="hidden xl:inline">Available</span>
        </Button>
      </div>

      {/* Offline Cache Badge */}
      {!isOnline && products && lastOnlineAt && (
        <div className="flex items-center gap-1.5 px-1 text-xs text-amber-600 dark:text-amber-400">
          <Icon name="Database" className="h-3.5 w-3.5" />

          <span>
            Catalog cached · last synced{" "}
            {Math.round((Date.now() - lastOnlineAt) / 60_000)} min ago
          </span>
        </div>
      )}

      {/* Categories */}
      {!searchQuery && (
        <div className="space-y-2">
          <Shad.Carousel
            opts={{
              align: "start",
              dragFree: true,
            }}
            className="w-full"
          >
            <Shad.CarouselContent className="ml-8">
              <Shad.CarouselItem className="basis-auto pl-2">
                <SButton
                  variant={!selectedCategoryId ? "secondary" : "outline"}
                  onClick={() => {
                    setSelectedCategoryId(null);
                    setSelectedSubcategoryId(null);
                  }}
                  className="whitespace-nowrap"
                >
                  All
                </SButton>
              </Shad.CarouselItem>

              {activeCategories.map((category) => {
                const isSelected = selectedCategoryId === category.id;
                const hex = category.color?.hex;

                return (
                  <Shad.CarouselItem
                    key={category.id}
                    className="basis-auto pl-2"
                  >
                    <SButton
                      variant={isSelected ? "secondary" : "outline"}
                      onClick={() => {
                        setSelectedCategoryId(category.id);
                        setSelectedSubcategoryId(null);
                      }}
                      className="whitespace-nowrap transition-colors"
                      style={{
                        borderColor: hex ? `${hex}40` : undefined,
                        color: hex || undefined,
                        backgroundColor:
                          isSelected && hex ? `${hex}1A` : undefined,
                      }}
                    >
                      {category.name}
                    </SButton>
                  </Shad.CarouselItem>
                );
              })}
            </Shad.CarouselContent>

            <Shad.CarouselPrevious className="left-0" />
            <Shad.CarouselNext className="right-0" />
          </Shad.Carousel>

          {/* Subcategories */}
          {selectedCategoryId && activeSubcategories.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              <Button
                size="sm"
                variant={!selectedSubcategoryId ? "secondary" : "outline"}
                onClick={() => setSelectedSubcategoryId(null)}
                className="h-8"
              >
                All
              </Button>

              {activeSubcategories.map((subcategory) => (
                <Button
                  key={subcategory.id}
                  size="sm"
                  variant={
                    selectedSubcategoryId === subcategory.id
                      ? "secondary"
                      : "outline"
                  }
                  onClick={() => setSelectedSubcategoryId(subcategory.id)}
                  className="h-8"
                >
                  {subcategory.name}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <Shad.ScrollArea className="min-h-0 flex-1 pr-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          renderProducts()
        )}
      </Shad.ScrollArea>
    </div>
  );
};
