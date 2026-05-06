import { useCreateOfferGroup, useUpdateOfferGroup } from "@/hooks/useOffers";
import { useModalStore } from "@/store/modalStore";
import type { OfferGroup } from "@/dto/offers.dto";
import { Button, InputField } from "@repo/ui";
import { useForm } from "@tanstack/react-form";

type OfferGroupFormProps = {
  offerId: string;
  group?: OfferGroup;
};

export const OfferGroupForm = ({ offerId, group }: OfferGroupFormProps) => {
  const { closeModal } = useModalStore();
  const isEditing = !!group;

  const createGroup = useCreateOfferGroup();
  const updateGroup = useUpdateOfferGroup();

  const isSubmitting = createGroup.isPending || updateGroup.isPending;

  const form = useForm({
    defaultValues: {
      name: group?.name ?? "",
      freeItemsCount: group?.freeItemsCount ?? 0,
      maxItemsCount: group?.maxItemsCount ?? 1,
    },
    onSubmit: async ({ value }) => {
      try {
        if (isEditing) {
          await updateGroup.mutateAsync({
            offerId,
            groupId: group.id,
            data: {
              name: value.name,
              freeItemsCount: value.freeItemsCount,
              maxItemsCount: value.maxItemsCount,
            },
          });
        } else {
          await createGroup.mutateAsync({
            offerId,
            data: {
              name: value.name,
              freeItemsCount: value.freeItemsCount,
              maxItemsCount: value.maxItemsCount,
            },
          });
        }
        closeModal();
      } catch (error) {
        console.error(error);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    form.handleSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <form.Field name="name">
        {(field) => (
          <InputField
            label="Group Name"
            placeholder="e.g. Choose Your Drink, Pick a Side"
            field={field}
            required
            autoFocus
          />
        )}
      </form.Field>

      <form.Field name="maxItemsCount">
        {(field) => (
          <InputField
            label="Max Items Count"
            placeholder="1"
            field={field}
            subLabel="Maximum number of items a customer can select from this group."
          />
        )}
      </form.Field>

      <form.Field name="freeItemsCount">
        {(field) => (
          <InputField
            label="Free Items Count"
            placeholder="0"
            field={field}
            subLabel="Number of items whose extra price is waived (highest-priced first)."
          />
        )}
      </form.Field>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={closeModal}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" isSubmitting={isSubmitting}>
          {isEditing ? "Update Group" : "Create Group"}
        </Button>
      </div>
    </form>
  );
};
