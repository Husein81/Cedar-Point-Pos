import { useDatabaseContext } from "@/components/provider/DatabaseProvider";
import { useColors } from "@/hooks/useColor";
import { useLocalCategories } from "@/hooks/offline/useLocalCategories";
import { useLocalProductsSearch } from "@/hooks/offline/useLocalProducts";
import { useAuthStore } from "@/store/authStore";
import { useBranchStore } from "@/store/branchStore";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ProductDocument } from "@/db/types";
import type { SelectedModifier } from "@/types/modifiers";
import { Button, cn, Empty, Icon, Input, SButton, Shad } from "@repo/ui";

import { OfflineModifierModal } from "./OfflineModifierModal";
import { OfflineProductCard } from "./OfflineProductCard";

export function OfflineProductBrowser() {
  const { user } = useAuthStore();
  const tenantId = user?.tenantId;

  const { branchId } = useBranchStore();
  const { isReady, syncError } = useDatabaseContext();
  const { addItem } = useOrderStore();
  const { openModal } = useModalStore();
  const { data: colors = [] } = useColors();

  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isAvailableOnly, setIsAvailableOnly] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      const isTypingInField = activeTag === "INPUT" || activeTag === "TEXTAREA";

      if (
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        !isTypingInField
      ) {
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, []);

  // Data
  const { categories, isLoading: categoriesLoading } = useLocalCategories({
    tenantId: tenantId!,
  });

  const { products: allProducts, isLoading: productsLoading } =
    useLocalProductsSearch(search, {
      branchId: branchId ?? undefined,
      categoryId: activeCategoryId ?? undefined,
    });

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const color of colors) map[color.id] = color.hex;
    return map;
  }, [colors]);

  const categoryMap = useMemo(() => {
    const map: Record<string, (typeof categories)[number]> = {};
    for (const cat of categories) map[cat.id] = cat;
    return map;
  }, [categories]);

  const activeCategories = useMemo(() => {
    if (!tenantId) return [];
    return categories.filter(
      (cat) => !cat.isDeleted && cat.tenantId === tenantId,
    );
  }, [categories, tenantId]);

  const filteredProducts = useMemo(() => {
    if (!allProducts?.length) return [];

    return allProducts.filter((product) => {
      if (product.isDeleted) return false;

      if (isAvailableOnly && "isAvailable" in product) {
        return Boolean(product.isAvailable);
      }

      return true;
    });
  }, [allProducts, isAvailableOnly]);

  // Handlers (stable refs)
  const handleCategoryClick = useCallback((categoryId: string | null) => {
    setActiveCategoryId(categoryId);
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [],
  );

  const handleAddToOrder = (
    product: ProductDocument,
    modifiers?: SelectedModifier[],
  ) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      quantity: 1,
      imageUrl: product.imageUrl || undefined,
      modifiers: modifiers?.map((m) => ({
        modifierId: m.modifierId,
        name: m.name,
        price: m.price,
      })),
    });
  };

  const handleShowModifiers = (product: ProductDocument) => {
    if (!tenantId) return;

    if (!product.isModifiable || !product.modifierGroups?.length) {
      // If product isn't modifiable, just add it to the order without showing the modal
      handleAddToOrder(product);
      return;
    }

    openModal(
      product.name,
      <OfflineModifierModal
        product={product}
        tenantId={tenantId}
        onConfirm={(modifiers: SelectedModifier[], quantity: number) => {
          if (quantity >= 1) {
            addItem({
              productId: product.id,
              name: product.name,
              price: Number(product.price) || 0,
              quantity,
              imageUrl: product.imageUrl || undefined,
              modifiers: modifiers.map((m) => ({
                modifierId: m.modifierId,
                name: m.name,
                price: m.price,
              })),
            });
          }
        }}
      />,
      "Customize your item",
    );
  };

  // Error state
  if (syncError && !isReady) {
    const errorMsg =
      syncError instanceof Error ? syncError.message : String(syncError);

    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
        <p className="text-lg font-semibold text-red-600">Database Error</p>
        <p className="max-w-lg rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMsg}
        </p>
        <Button onClick={() => window.location.reload()}>Reload App</Button>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Initializing local database…</p>
      </div>
    );
  }

  const productCount = filteredProducts.length;

  return (
    <div className={cn("flex h-full flex-col gap-4")}>
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name, barcode, or SKU..."
            value={search}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        <Button
          onClick={() => setIsAvailableOnly((v) => !v)}
          variant={isAvailableOnly ? "default" : "outline"}
          className="whitespace-nowrap"
          size="sm"
        >
          Available
        </Button>
      </div>

      {/* Category Filter Carousel */}
      {!categoriesLoading && activeCategories.length > 0 && (
        <div className="relative">
          <div className="pointer-events-none absolute -left-1 top-0 z-10 h-full w-6 bg-linear-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute -right-1 top-0 z-10 h-full w-6 bg-linear-to-l from-background to-transparent" />

          <Shad.Carousel
            opts={{ align: "start", dragFree: true }}
            className="w-full"
          >
            <Shad.CarouselContent className="mx-6">
              {/* All Products */}
              <Shad.CarouselItem className="basis-auto pl-2">
                <Button
                  onClick={() => handleCategoryClick(null)}
                  variant={activeCategoryId === null ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap"
                  iconName="Grid2x2"
                >
                  All Products
                </Button>
              </Shad.CarouselItem>

              {activeCategories.map((cat) => {
                const hex = cat.colorId ? colorMap[cat.colorId] : undefined;

                return (
                  <Shad.CarouselItem key={cat.id} className="basis-auto pl-2">
                    <SButton
                      style={{
                        borderWidth: 1,
                        borderColor: hex,
                        color: hex,
                      }}
                      onClick={() => handleCategoryClick(cat.id)}
                      variant={
                        activeCategoryId === cat.id ? "default" : "outline"
                      }
                      size="sm"
                      className="whitespace-nowrap"
                    >
                      {cat.name}
                    </SButton>
                  </Shad.CarouselItem>
                );
              })}
            </Shad.CarouselContent>
          </Shad.Carousel>
        </div>
      )}

      {/* Products Grid */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {productsLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">Loading products…</p>
          </div>
        ) : productCount === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Empty
              title={search ? "No products found" : "No products available"}
              description={
                search
                  ? "Try adjusting your search filters"
                  : "Add products to get started"
              }
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 pr-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {filteredProducts.map((product) => {
                const productCategory = categoryMap[product.categoryId!];
                const categoryColorHex = productCategory?.colorId
                  ? colorMap[productCategory.colorId]
                  : undefined;

                return (
                  <OfflineProductCard
                    key={product.id}
                    product={product}
                    categoryColorHex={categoryColorHex}
                    onClick={() => handleShowModifiers(product)}
                  />
                );
              })}
            </div>

            <p className="pt-4 text-center text-xs text-muted-foreground">
              {productCount} product{productCount !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
