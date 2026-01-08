import { Button, Icon, Input, Shad, Skeleton, Empty } from "@repo/ui";
import { useProducts } from "@/hooks/useProduct";
import { useCategories } from "@/hooks/useCategory";
import { useOrderStore } from "@/store/orderStore";
import { cn } from "@repo/ui";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { Product } from "@repo/types";

interface ProductGridProps {
  className?: string;
}

// Format currency for Lebanese retail (LBP)
const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) return "N/A";
  return new Intl.NumberFormat("en-LB", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

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

  const handleProductClick = useCallback(
    (product: Product) => {
      addItem({
        productId: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        quantity: 1,
      });
    },
    [addItem]
  );

  const handleCategoryClick = useCallback((categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // On Enter, if exactly one product matches, add it
      if (
        e.key === "Enter" &&
        filteredProducts.length === 1 &&
        filteredProducts[0]
      ) {
        handleProductClick(filteredProducts[0]);
        setSearchQuery("");
      }
    },
    [filteredProducts, handleProductClick]
  );

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

      {/* Category Quick Filters */}
      <Shad.ScrollArea className="shrink-0 pb-2">
        <div className="flex gap-2 pb-1">
          <Button
            onClick={() => handleCategoryClick(null)}
            variant={selectedCategoryId === null ? "default" : "outline"}
            size="lg"
            className="whitespace-nowrap"
          >
            All Products
          </Button>

          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-md" />
              ))
            : activeCategories.map((category) => (
                <Button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  variant={
                    selectedCategoryId === category.id ? "default" : "outline"
                  }
                  size="lg"
                  className="whitespace-nowrap"
                >
                  {category.name}
                </Button>
              ))}
        </div>
        <Shad.ScrollBar orientation="horizontal" />
      </Shad.ScrollArea>

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

// =====================
// Product Card Component
// =====================

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

const ProductCard = ({ product, onClick }: ProductCardProps) => {
  const hasImage = !!product.imageUrl;

  return (
    <Shad.Card
      onClick={onClick}
      className={cn(
        "flex flex-col p-0 gap-0 h-full w-full overflow-hidden group/card cursor-pointer",
        "border-border/50",
        "hover:border-primary/30 hover:shadow-md",
        "transition-all duration-200 active:scale-[0.98]"
      )}
    >
      {/* Image Container - edge-to-edge, premium look */}
      <div className="relative w-full h-40 overflow-hidden bg-muted/20 shrink-0 border-b border-border/50">
        {hasImage ? (
          <img
            src={product.imageUrl!}
            alt={product.name}
            className="w-full h-full object-cover object-center transition-transform duration-300 group-hover/card:scale-105"
            draggable={false}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-muted/30 to-muted/60">
            <Icon
              name="Package"
              className="w-10 h-10 text-muted-foreground/50"
            />
          </div>
        )}
      </div>

      {/* Content - clean hierarchy */}
      <div className="flex flex-col p-3 gap-1.5 flex-1">
        <p className="text-sm font-medium leading-tight line-clamp-2 h-10 cursor-default text-left">
          {product.name}
        </p>

        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-primary">
            ${formatPrice(Number(product.price))}
          </span>
        </div>

        <p className="text-[10px] text-muted-foreground/70 truncate font-mono h-4 text-left">
          {product.barcode ?? ""}
        </p>
      </div>
    </Shad.Card>
  );
};
