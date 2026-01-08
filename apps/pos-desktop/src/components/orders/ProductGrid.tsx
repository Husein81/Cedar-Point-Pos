import { Button, Icon, Input, Shad, Skeleton, Empty } from "@repo/ui";
import { useProducts } from "@/hooks/useProduct";
import { useCategories } from "@/hooks/useCategory";
import { useOrderStore } from "@/store/orderStore";
import { cn } from "@repo/ui";
import { useState, useMemo, useRef, useEffect } from "react";
import type { Product } from "@repo/types";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  className?: string;
}

export const ProductGrid = ({ className }: ProductGridProps) => {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { addItem } = useOrderStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search on keyboard input (for barcode scanner support)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // If typing and not in an input, focus the search
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
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, []);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter((product) => {
      // Only show active, non-deleted, non-ingredient products
      if (!product.isActive || product.isDeleted || product.isIngredient) {
        return false;
      }

      // Category filter
      if (selectedCategoryId && product.categoryId !== selectedCategoryId) {
        return false;
      }

      // Search filter (name, barcode, sku)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesBarcode = product.barcode?.toLowerCase().includes(query);
        const matchesSku = product.sku?.toLowerCase().includes(query);

        if (!matchesName && !matchesBarcode && !matchesSku) {
          return false;
        }
      }

      return true;
    });
  }, [products, selectedCategoryId, searchQuery]);

  // Filter categories to only show those with products
  const activeCategories = useMemo(() => {
    if (!categories || !products) return [];

    const categoryIdsWithProducts = new Set(
      products
        .filter((p) => p.isActive && !p.isDeleted && !p.isIngredient)
        .map((p) => p.categoryId)
        .filter(Boolean)
    );

    return categories.filter(
      (cat) => !cat.isDeleted && categoryIdsWithProducts.has(cat.id)
    );
  }, [categories, products]);

  const handleProductClick = (product: Product) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      quantity: 1,
    });
  };

  const handleCategoryClick = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // On Enter, if exactly one product matches, add it
    if (
      e.key === "Enter" &&
      filteredProducts.length === 1 &&
      filteredProducts[0]
    ) {
      handleProductClick(filteredProducts[0]);
      setSearchQuery("");
    }
  };

  const isLoading = productsLoading || categoriesLoading;

  return (
    <div className={cn("flex flex-col h-full gap-4", className)}>
      {/* Search Bar */}
      <div className="relative">
        <Icon
          name="Search"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
        />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Search by name, barcode, or SKU..."
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          className="pl-10 h-11"
        />
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute -left-1 top-0 h-full w-6 bg-linear-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute -right-1 top-0 h-full w-6 bg-linear-to-l from-background to-transparent z-10" />

        {/* Category Quick Filters */}
        <Shad.Carousel
          opts={{
            align: "start",
            dragFree: true,
          }}
          className="w-full"
        >
          <Shad.CarouselContent className="-ml-2">
            {/* All Products */}
            <Shad.CarouselItem className="pl-2 basis-auto">
              <Button
                onClick={() => handleCategoryClick(null)}
                variant={selectedCategoryId === null ? "default" : "outline"}
                size="lg"
                className="whitespace-nowrap"
                iconName="Grid2x2"
              >
                All Products
              </Button>
            </Shad.CarouselItem>

            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Shad.CarouselItem key={i} className="pl-2 basis-auto">
                    <Skeleton className="h-9 w-24 rounded-md" />
                  </Shad.CarouselItem>
                ))
              : activeCategories.map((category) => (
                  <Shad.CarouselItem
                    key={category.id}
                    className="pl-2 basis-auto"
                  >
                    <Button
                      onClick={() => handleCategoryClick(category.id)}
                      variant={
                        selectedCategoryId === category.id
                          ? "default"
                          : "outline"
                      }
                      size="lg"
                      className="whitespace-nowrap"
                    >
                      {category.name}
                    </Button>
                  </Shad.CarouselItem>
                ))}
          </Shad.CarouselContent>

          {/* Navigation Arrows */}
          <Shad.CarouselPrevious className="-left-1" />
          <Shad.CarouselNext className="-right-1" />
        </Shad.Carousel>
      </div>

      {/* Product Grid */}
      <Shad.ScrollArea className="flex-1 min-h-0 pr-3">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <Empty title="No products found" icon="Search" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => handleProductClick(product)}
              />
            ))}
          </div>
        )}
        <Shad.ScrollBar />
      </Shad.ScrollArea>
    </div>
  );
};
