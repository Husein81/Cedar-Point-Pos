import { Input, Shad, Skeleton } from "@repo/ui";
import { Search } from "lucide-react";
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
      if (e.key === "Enter" && filteredProducts.length === 1 && filteredProducts[0]) {
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Search by name, barcode, or SKU..."
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          className="pl-10 h-12 text-base"
        />
      </div>

      {/* Category Quick Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => handleCategoryClick(null)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-11",
            selectedCategoryId === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          )}
        >
          All Products
        </button>

        {isLoading ? (
          // Loading skeleton for categories
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-24 rounded-lg" />
          ))
        ) : (
          activeCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-11",
                selectedCategoryId === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {category.name}
            </button>
          ))
        )}
      </div>

      {/* Product Grid */}
      <Shad.ScrollArea className="flex-1">
        {isLoading ? (
          // Loading skeleton for products
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Search className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm">
              {searchQuery
                ? "Try a different search term"
                : "No products in this category"}
            </p>
          </div>
        ) : (
          // Product cards grid
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
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col p-4 rounded-xl border bg-card text-left transition-all",
        "hover:shadow-md hover:border-primary/50 hover:scale-[1.02]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "active:scale-[0.98]",
        "min-h-30"
      )}
    >
      {/* Product Image (if available) */}
      {product.imageUrl && (
        <div className="w-full h-16 mb-2 rounded-lg overflow-hidden bg-muted">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Product Name */}
      <h3 className="font-medium text-sm line-clamp-2 flex-1">
        {product.name}
      </h3>

      {/* Price */}
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-lg font-semibold text-primary">
          {formatPrice(Number(product.price))}
        </span>
        <span className="text-xs text-muted-foreground">LBP</span>
      </div>

      {/* SKU/Barcode indicator (optional, for quick reference) */}
      {product.barcode && (
        <p className="text-[10px] text-muted-foreground mt-1 truncate">
          {product.barcode}
        </p>
      )}
    </button>
  );
};
