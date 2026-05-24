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
import { useNetworkStatus } from "@/context/NetworkContext";

export const ProductGrid = () => {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { addItem } = useOrderStore();
  const { isOnline, lastOnlineAt } = useNetworkStatus();

  const [isAvailableOnly, setIsAvailableOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
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
      if (!product.isActive || product.deletedAt) {
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
    products,
    selectedCategoryId,
    selectedSubcategoryId,
    searchQuery,
    isAvailableOnly,
  ]);

  // Filter categories to only show those with products
  const activeCategories = useMemo(() => {
    if (!categories || !products) return [];

    const categoryIdsWithProducts = new Set(
      products
        .filter((p) => p.isActive && !p.deletedAt)
        .map((p) => p.categoryId)
        .filter(Boolean),
    );

    return categories.filter(
      (cat) => !cat.deletedAt && categoryIdsWithProducts.has(cat.id),
    );
  }, [categories, products]);

  // Get subcategories for the selected category
  const activeSubcategories = useMemo((): Subcategory[] => {
    if (!selectedCategoryId || !categories || !products) return [];

    const selectedCategory = categories.find(
      (cat) => cat.id === selectedCategoryId,
    );
    if (!selectedCategory?.subcategories) return [];

    // Only show subcategories that have active products
    const subcategoryIdsWithProducts = new Set(
      products
        .filter(
          (p) =>
            p.isActive && !p.deletedAt && p.categoryId === selectedCategoryId,
        )
        .map((p) => p.subcategoryId)
        .filter(Boolean),
    );

    return selectedCategory.subcategories.filter(
      (sub) => !sub.deletedAt && subcategoryIdsWithProducts.has(sub.id),
    );
  }, [selectedCategoryId, categories, products]);

  // Get the selected category's color for subcategories
  const selectedCategoryColor = useMemo(() => {
    if (!selectedCategoryId || !categories) return null;
    const category = categories.find((cat) => cat.id === selectedCategoryId);
    return category?.color?.hex;
  }, [selectedCategoryId, categories]);

  const handleProductClick = (product: Product) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      quantity: 1,
      imageUrl: product.imageUrl,
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
    <div className={cn("flex flex-col h-full gap-4")}>
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
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
            className="pl-10 h-12 text-lg"
          />
        </div>
        <Button
          onClick={() => setIsAvailableOnly(!isAvailableOnly)}
          variant={isAvailableOnly ? "default" : "outline"}
          className="whitespace-nowrap h-12"
        >
          <Icon name="PackageCheck" className="w-5 h-5 mr-2" />
          Available Only
        </Button>
      </div>

      {/* Cache freshness badge — shown when offline and data is from cache */}
      {!isOnline && products && lastOnlineAt && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 px-1">
          <Icon name="Database" className="w-3.5 h-3.5" />
          <span>
            Catalog cached · last synced{" "}
            {Math.round((Date.now() - lastOnlineAt) / 60_000)} min ago
          </span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      {!searchQuery && (
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <Button
            variant={selectedCategoryId ? "outline" : "secondary"}
            size="sm"
            onClick={() => handleCategoryClick(null)}
            className="gap-2 h-10  px-4"
          >
            <Icon name="House" className="w-4 h-4" />
            Home
          </Button>

          {selectedCategoryId && (
            <>
              <Icon
                name="ChevronRight"
                className="w-4 h-4 text-muted-foreground"
              />
              <Button
                variant={selectedSubcategoryId ? "outline" : "secondary"}
                size="sm"
                onClick={() => handleSubcategoryClick(null)}
                className="gap-1  h-10 px-4"
              >
                {categories?.find((c) => c.id === selectedCategoryId)?.name}
              </Button>
            </>
          )}

          {selectedSubcategoryId && (
            <>
              <Icon
                name="ChevronRight"
                className="w-4 h-4 text-muted-foreground"
              />
              <Button
                variant="secondary"
                size="sm"
                className="gap-1  h-10 px-4 pointer-events-none"
              >
                {
                  categories
                    ?.find((c) => c.id === selectedCategoryId)
                    ?.subcategories?.find((s) => s.id === selectedSubcategoryId)
                    ?.name
                }
              </Button>
            </>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <Shad.ScrollArea className="flex-1 min-h-0 pr-3">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5  gap-1 p-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-32 bg-muted" />
            ))}
          </div>
        ) : searchQuery ? (
          // Search Results Mode
          filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <Empty title="No products found" icon="Search" />
            </div>
          ) : (
            <div className="grid p-1 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )
        ) : !selectedCategoryId ? (
          // Root Level: Categories Grid & All Products
          <div className="space-y-6">
            {activeCategories.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6  gap-1 p-1">
                {activeCategories.map((category) => (
                  <SButton
                    key={category.id}
                    variant="outline"
                    onClick={() => handleCategoryClick(category.id)}
                    className="h-20 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md flex flex-col items-center justify-center p-4 transition-transform active:scale-95 border shadow-sm hover:shadow-md"
                    style={{
                      borderColor: category.color?.hex
                        ? `${category.color.hex}40`
                        : "var(--border)",
                      color: category.color?.hex || "inherit",
                    }}
                  >
                    <Icon name="Folder" className="opacity-80" />
                    <span className="font-bold text-xs text-center leading-tight line-clamp-2">
                      {category.name}
                    </span>
                  </SButton>
                ))}
              </div>
            )}

            {/* Products Grid */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground px-1">
                All Products
              </h3>
              {filteredProducts.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <Empty title="No products found" icon="PackageX" />
                </div>
              ) : (
                <div className="grid p-1 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Category Level: Subcategories & Products
          <div className="space-y-6">
            {/* Subcategories Grid */}
            {!selectedSubcategoryId && activeSubcategories.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1 p-1">
                {activeSubcategories.map((sub) => (
                  <SButton
                    key={sub.id}
                    variant={"outline"}
                    onClick={() => handleSubcategoryClick(sub.id)}
                    className="h-20 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md flex flex-col items-center justify-center p-4 transition-transform active:scale-95 border shadow-sm hover:shadow-md"
                    style={{
                      borderColor: selectedCategoryColor
                        ? `${selectedCategoryColor}40`
                        : "var(--border)",
                      color: selectedCategoryColor || "inherit",
                    }}
                  >
                    <Icon name="FolderOpen" className="mb-1 opacity-70" />
                    <span className="font-semibold text-sm text-center leading-tight line-clamp-2">
                      {sub.name}
                    </span>
                  </SButton>
                ))}
              </div>
            )}

            {/* Products Grid */}
            <div>
              {filteredProducts.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <Empty title="No products found" icon="PackageX" />
                </div>
              ) : (
                <div className="grid p-1 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Shad.ScrollArea>
    </div>
  );
};
