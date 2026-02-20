import { useState } from "react";
import { Button, Input, Label } from "@repo/ui";
import { useCreateOfferGroup, useUpdateOfferGroup } from "@/hooks/useOffers";
import { useModalStore } from "@/store/modalStore";
import type { OfferGroup } from "@/dto/offers.dto";

type OfferGroupFormProps = {
  offerId: string;
  group?: OfferGroup;
};

export const OfferGroupForm = ({ offerId, group }: OfferGroupFormProps) => {
  const { closeModal } = useModalStore();
  const isEditing = !!group;

  const [name, setName] = useState(group?.name ?? "");
  const [freeItemsCount, setFreeItemsCount] = useState(
    group ? String(group.freeItemsCount) : "0",
  );

  const createGroup = useCreateOfferGroup();
  const updateGroup = useUpdateOfferGroup();

  const isSubmitting = createGroup.isPending || updateGroup.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedFreeItems = parseInt(freeItemsCount, 10);
    if (!name.trim() || isNaN(parsedFreeItems) || parsedFreeItems < 0) return;

    if (isEditing) {
      updateGroup.mutate(
        {
          offerId,
          groupId: group.id,
          data: { name: name.trim(), freeItemsCount: parsedFreeItems },
        },
        { onSuccess: () => closeModal() },
      );
    } else {
      createGroup.mutate(
        {
          offerId,
          data: { name: name.trim(), freeItemsCount: parsedFreeItems },
        },
        { onSuccess: () => closeModal() },
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="group-name">Group Name</Label>
        <Input
          id="group-name"
          placeholder="e.g. Choose Your Drink, Pick a Side"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="free-items">Free Items Count</Label>
        <Input
          id="free-items"
          type="number"
          min="0"
          step="1"
          placeholder="0"
          value={freeItemsCount}
          onChange={(e) => setFreeItemsCount(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Number of items whose extra price is waived (highest-priced first).
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
          disabled={isSubmitting || !name.trim()}
        >
          {isSubmitting
            ? "Saving..."
            : isEditing
              ? "Update Group"
              : "Create Group"}
        </Button>
      </div>
    </form>
  );
};
