import { Button, Icon, Input, Shad, Skeleton, Empty, cn } from "@repo/ui";
import { useProducts } from "@/hooks/useProduct";
import { useCategories } from "@/hooks/useCategory";
import { useOrderStore } from "@/store/orderStore";
import { useState, useMemo, useRef, useEffect } from "react";
import type { Product } from "@repo/types";
import ProductCard from "./ProductCard";

type Props = {
  className?: string;
};

export const ProductGrid = ({ className }: Props) => {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { addItem } = useOrderStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<
    string | null
  >(null);
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

  // Filter products based on search, category, and subcategory
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter((product) => {
      // Only show active, non-deleted, non-ingredient products
      if (!product.isActive || product.isDeleted || product.isIngredient) {
        return false;
      }

      // Search overrides category/subcategory filters (global search)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesBarcode = product.barcode?.toLowerCase().includes(query);
        const matchesSku = product.sku?.toLowerCase().includes(query);

        return matchesName || matchesBarcode || matchesSku;
      }

      // Category filter
      if (selectedCategoryId && product.categoryId !== selectedCategoryId) {
        return false;
      }

      // Subcategory filter (null means "All" - show all products in category)
      if (
        selectedSubcategoryId &&
        product.subcategoryId !== selectedSubcategoryId
      ) {
        return false;
      }

      return true;
    });
  }, [products, selectedCategoryId, selectedSubcategoryId, searchQuery]);

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

  // Get subcategories for the selected category
  const activeSubcategories = useMemo(() => {
    if (!selectedCategoryId || !categories || !products) return [];

    const selectedCategory = categories.find(
      (cat) => cat.id === selectedCategoryId
    );
    if (!selectedCategory?.subcategories) return [];

    // Only show subcategories that have active products
    const subcategoryIdsWithProducts = new Set(
      products
        .filter(
          (p) =>
            p.isActive &&
            !p.isDeleted &&
            !p.isIngredient &&
            p.categoryId === selectedCategoryId
        )
        .map((p) => p.subcategoryId)
        .filter(Boolean)
    );

    return selectedCategory.subcategories.filter(
      (sub) => !sub.isDeleted && subcategoryIdsWithProducts.has(sub.id)
    );
  }, [selectedCategoryId, categories, products]);

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
    // Reset subcategory when category changes
    setSelectedSubcategoryId(null);
  };

  const handleSubcategoryClick = (subcategoryId: string | null) => {
    setSelectedSubcategoryId(subcategoryId);
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
          className="pl-10 h-10"
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
                    <Skeleton className="h-10 w-27 rounded-md" />
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

      {/* Subcategory Quick Filters - Only show when category has subcategories and no search active */}
      {!searchQuery && activeSubcategories.length > 0 && (
        <div className="relative">
          <div className="pointer-events-none absolute -left-1 top-0 h-full w-6 bg-linear-to-r from-background to-transparent z-10" />
          <div className="pointer-events-none absolute -right-1 top-0 h-full w-6 bg-linear-to-l from-background to-transparent z-10" />

          <Shad.Carousel
            opts={{
              align: "start",
              dragFree: true,
            }}
            className="w-full"
          >
            <Shad.CarouselContent className="mx-6">
              {/* All (in category) */}
              <Shad.CarouselItem className="pl-2 basis-auto">
                <Button
                  onClick={() => handleSubcategoryClick(null)}
                  variant={
                    selectedSubcategoryId === null ? "secondary" : "ghost"
                  }
                  size="default"
                  className="whitespace-nowrap text-sm"
                >
                  All
                </Button>
              </Shad.CarouselItem>

              {activeSubcategories.map((subcategory) => (
                <Shad.CarouselItem
                  key={subcategory.id}
                  className="pl-2 basis-auto"
                >
                  <Button
                    onClick={() => handleSubcategoryClick(subcategory.id)}
                    variant={
                      selectedSubcategoryId === subcategory.id
                        ? "secondary"
                        : "ghost"
                    }
                    size="default"
                    className="whitespace-nowrap text-sm"
                  >
                    {subcategory.name}
                  </Button>
                </Shad.CarouselItem>
              ))}
            </Shad.CarouselContent>

            {/* Navigation Arrows */}
            <Shad.CarouselPrevious className="-left-1" />
            <Shad.CarouselNext className="-right-1" />
          </Shad.Carousel>
        </div>
      )}

      {/* Product Grid */}
      <Shad.ScrollArea className="flex-1 min-h-0 pr-3">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <Empty title="No products found" icon="Search" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        <Shad.ScrollBar />
      </Shad.ScrollArea>
    </div>
  );
};
