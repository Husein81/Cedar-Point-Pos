import { useState } from "react";
import { Button, Input, Label } from "@repo/ui";
import { useCreateOffer, useUpdateOffer } from "@/hooks/useOffers";
import { useModalStore } from "@/store/modalStore";
import type { Offer } from "@/dto/offers.dto";

type OfferFormProps = {
  offer?: Offer;
};

export const OfferForm = ({ offer }: OfferFormProps) => {
  const { closeModal } = useModalStore();
  const isEditing = !!offer;

  const [name, setName] = useState(offer?.name ?? "");
  const [basePrice, setBasePrice] = useState(
    offer ? String(offer.basePrice) : "",
  );

  const createOffer = useCreateOffer();
  const updateOffer = useUpdateOffer();

  const isSubmitting = createOffer.isPending || updateOffer.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPrice = parseFloat(basePrice);
    if (!name.trim() || isNaN(parsedPrice) || parsedPrice < 0) return;

    if (isEditing) {
      updateOffer.mutate(
        { id: offer.id, data: { name: name.trim(), basePrice: parsedPrice } },
        { onSuccess: () => closeModal() },
      );
    } else {
      createOffer.mutate(
        { name: name.trim(), basePrice: parsedPrice },
        { onSuccess: () => closeModal() },
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="offer-name">Name</Label>
        <Input
          id="offer-name"
          placeholder="e.g. Combo Meal, Family Bundle"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="offer-price">Base Price</Label>
        <Input
          id="offer-price"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={basePrice}
          onChange={(e) => setBasePrice(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          The flat price for the entire offer before any extras.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={closeModal}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting || !name.trim() || !basePrice}
        >
          {isSubmitting
            ? "Saving..."
            : isEditing
              ? "Update Offer"
              : "Create Offer"}
        </Button>
      </div>
    </form>
  );
};
