import { useNetworkStatus } from "@/context/NetworkContext";
import { useCategories } from "@/hooks/useCategory";
import { useProducts } from "@/hooks/useProduct";
import { useOrderStore } from "@/store/orderStore";
import type { Product } from "@repo/types";
import { Subcategory } from "@repo/types";
import {
  Button,
  Empty,
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

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
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

    window.addEventListener("keypress", handleKeyPress);

    return () => {
      window.removeEventListener("keypress", handleKeyPress);
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
    if (
      e.key === "Enter" &&
      filteredProducts.length === 1 &&
      filteredProducts[0]
    ) {
      handleProductClick(filteredProducts[0]);

      setSearchQuery("");
    }
  };

  const renderProducts = () => {
    if (filteredProducts.length === 0) {
      return (
        <div className="flex items-center justify-center h-48">
          <Empty title="No products found" icon="PackageX" />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 p-1">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full gap-4")}>
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
          />

          <Input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search products..."
            className="pl-10 h-12 text-lg"
          />
        </div>

        <Button
          variant={isAvailableOnly ? "default" : "outline"}
          onClick={() => setIsAvailableOnly((prev) => !prev)}
          className="h-12 whitespace-nowrap"
        >
          <Icon name="PackageCheck" className="w-5 h-5 mr-2" />
          Available
        </Button>
      </div>

      {/* Offline Cache Badge */}
      {!isOnline && products && lastOnlineAt && (
        <div className="flex items-center gap-1.5 px-1 text-xs text-amber-600 dark:text-amber-400">
          <Icon name="Database" className="w-3.5 h-3.5" />

          <span>
            Catalog cached · last synced{" "}
            {Math.round((Date.now() - lastOnlineAt) / 60_000)} min ago
          </span>
        </div>
      )}

      {/* Categories */}
      {!searchQuery && (
        <div className="space-y-3">
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

              {activeCategories.map((category) => (
                <Shad.CarouselItem
                  key={category.id}
                  className="basis-auto pl-2"
                >
                  <SButton
                    variant={
                      selectedCategoryId === category.id
                        ? "secondary"
                        : "outline"
                    }
                    onClick={() => {
                      setSelectedCategoryId(category.id);
                      setSelectedSubcategoryId(null);
                    }}
                    className="whitespace-nowrap"
                    style={{
                      borderColor: category.color?.hex
                        ? `${category.color.hex}40`
                        : undefined,
                      color: category.color?.hex || undefined,
                    }}
                  >
                    {category.name}
                  </SButton>
                </Shad.CarouselItem>
              ))}
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
                  className="h-8 "
                >
                  {subcategory.name}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <Shad.ScrollArea className="flex-1 min-h-0 pr-3">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 p-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-32 bg-muted" />
            ))}
          </div>
        ) : (
          renderProducts()
        )}
      </Shad.ScrollArea>
    </div>
  );
};
