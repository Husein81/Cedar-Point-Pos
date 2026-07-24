import { useState, useMemo, useCallback } from "react";
import { useActiveOffers, usePricePreview } from "@/hooks/useOffers";
import { useBaseCurrency } from "@/hooks/useCurrency";
import { useModalStore } from "@/store/modalStore";
import { useOrderStore } from "@/store/orderStore";
import type {
  Offer,
  OfferGroup,
  PricePreviewResponse,
} from "@/dto/offers.dto";
import { Button, cn, Empty, Icon, Input } from "@repo/ui";

type Props = {
  onConfirm?: () => void;
};

export const OfferSelectionModal = ({ onConfirm }: Props) => {
  const { closeModal } = useModalStore();
  const { addItem } = useOrderStore();
  const { format: formatMoney } = useBaseCurrency();
  const { data: offersResponse, isLoading } = useActiveOffers();
  const pricePreviewMutation = usePricePreview();

  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [selections, setSelections] = useState<
    Record<string, string>
  >({});
  const [preview, setPreview] = useState<PricePreviewResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const offers = offersResponse?.data ?? [];

  const filteredOffers = useMemo(() => {
    if (!searchQuery.trim()) return offers;
    const q = searchQuery.toLowerCase();
    return offers.filter((o) => o.name.toLowerCase().includes(q));
  }, [offers, searchQuery]);

  const selectedOffer = offers.find((o) => o.id === selectedOfferId);

  const handleSelectOffer = useCallback(
    (offer: Offer) => {
      setSelectedOfferId(offer.id);
      setSelections({});
      setPreview(null);
    },
    [],
  );

  const handleSelectProduct = useCallback(
    (groupId: string, productId: string) => {
      setSelections((prev) => {
        const next = { ...prev, [groupId]: productId };

        // Check if all groups are selected — if so, trigger preview
        if (selectedOffer) {
          const allSelected = selectedOffer.offerGroups.every(
            (g) => next[g.id],
          );
          if (allSelected) {
            const selectionArray = Object.entries(next).map(([gId, pId]) => ({
              groupId: gId,
              productId: pId,
            }));
            pricePreviewMutation.mutate(
              {
                offerId: selectedOffer.id,
                selections: selectionArray,
              },
              {
                onSuccess: (data) => setPreview(data),
              },
            );
          }
        }
        return next;
      });
    },
    [selectedOffer, pricePreviewMutation],
  );

  const allGroupsSelected = selectedOffer?.offerGroups.every(
    (g) => selections[g.id],
  );

  const handleConfirm = () => {
    if (!selectedOffer || !preview || !preview.isValid) return;

    // Add each selected product as a cart item with offer pricing
    for (const group of preview.groups) {
      for (const item of group.items) {
        const itemPrice = item.isFree ? 0 : item.extraPrice;
        const basePriceShare =
          preview.basePrice / preview.groups.reduce(
            (sum, g) => sum + g.items.length,
            0,
          );

        addItem({
          productId: item.productId,
          name: item.productName,
          price: Number((basePriceShare + itemPrice).toFixed(2)),
          quantity: 1,
          imageUrl: undefined,
        });
      }
    }

    closeModal();
    onConfirm?.();
  };

  // === Offer list view ===
  if (!selectedOffer) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-4">
          <div className="relative mb-4">
            <Icon
              name="Search"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              placeholder="Search offers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Icon name="LoaderCircle" className="animate-spin h-6 w-6" />
            </div>
          ) : filteredOffers.length === 0 ? (
            <Empty
              title="No active offers"
              description="There are no active offers available."
            />
          ) : (
            <div className="space-y-2">
              {filteredOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSelectOffer(offer)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                      <Icon
                        name="BadgePercent"
                        className="h-4 w-4 text-primary"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{offer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {offer.offerGroups?.length ?? 0} groups
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {formatMoney(offer.basePrice)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-6 bg-background">
          <Button variant="outline" className="w-full" onClick={closeModal}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // === Offer configuration view ===
  return (
    <div className="flex flex-col h-full">
      {/* Back + Header */}
      <div className="px-6 py-3 border-b flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedOfferId(null);
            setSelections({});
            setPreview(null);
          }}
        >
          <Icon name="ArrowLeft" className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="font-semibold text-sm">{selectedOffer.name}</h3>
          <p className="text-xs text-muted-foreground">
            Select one product from each group
          </p>
        </div>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {selectedOffer.offerGroups.map((group) => (
          <OfferGroupSelector
            key={group.id}
            group={group}
            selectedProductId={selections[group.id] ?? null}
            onSelectProduct={(productId) =>
              handleSelectProduct(group.id, productId)
            }
          />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t p-6 bg-background">
        {/* Price Preview */}
        {preview && (
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Base Price</span>
              <span>{formatMoney(preview.basePrice)}</span>
            </div>
            {preview.totalExtras > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Extras</span>
                <span>+{formatMoney(preview.totalExtras)}</span>
              </div>
            )}
            {preview.totalFreeDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Free Item Discount</span>
                <span>-{formatMoney(preview.totalFreeDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">
                {formatMoney(preview.finalTotal)}
              </span>
            </div>
            {preview.validationErrors.length > 0 && (
              <div className="text-xs text-destructive mt-1">
                {preview.validationErrors.join(", ")}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={closeModal}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            disabled={
              !allGroupsSelected ||
              pricePreviewMutation.isPending ||
              (preview != null && !preview.isValid)
            }
          >
            {pricePreviewMutation.isPending ? "Calculating..." : "Add to Cart"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Group Selector Sub-component ───

type OfferGroupSelectorProps = {
  group: OfferGroup;
  selectedProductId: string | null;
  onSelectProduct: (productId: string) => void;
};

const OfferGroupSelector = ({
  group,
  selectedProductId,
  onSelectProduct,
}: OfferGroupSelectorProps) => {
  const { format: formatMoney } = useBaseCurrency();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-medium text-foreground">{group.name}</h3>
        {group.freeItemsCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            {group.freeItemsCount} free
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {group.offerGroupItems.map((item) => {
          const isSelected = selectedProductId === item.productId;
          const priceText =
            Number(item.extraPrice) > 0
              ? `+${formatMoney(item.extraPrice)}`
              : "";

          return (
            <Button
              key={item.id}
              onClick={() => onSelectProduct(item.productId)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all",
                "border border-border hover:border-primary/50",
                isSelected
                  ? "bg-primary text-white border-primary"
                  : "bg-background text-foreground",
              )}
            >
              <span>{item.product.name}</span>
              {priceText && (
                <span
                  className={
                    isSelected ? "opacity-90" : "text-muted-foreground"
                  }
                >
                  {priceText}
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
