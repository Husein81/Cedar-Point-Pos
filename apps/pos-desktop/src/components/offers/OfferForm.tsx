import type { Offer } from "@/dto/offers.dto";
import { useCreateOffer, useUpdateOffer } from "@/hooks/useOffers";
import { useModalStore } from "@/store/modalStore";
import { Button, InputField } from "@repo/ui";
import { useForm } from "@tanstack/react-form";

type OfferFormProps = {
  offer?: Offer;
};

export const OfferForm = ({ offer }: OfferFormProps) => {
  const { closeModal } = useModalStore();
  const isEditing = !!offer;

  const createOffer = useCreateOffer();
  const updateOffer = useUpdateOffer();

  const isSubmitting = createOffer.isPending || updateOffer.isPending;

  const form = useForm({
    defaultValues: {
      name: offer?.name ?? "",
      basePrice: offer?.basePrice ?? 0,
    },
    onSubmit: async ({ value }) => {
      try {
        if (isEditing) {
          await updateOffer.mutateAsync({
            id: offer.id,
            data: { name: value.name, basePrice: value.basePrice },
          });
        } else {
          await createOffer.mutateAsync({
            name: value.name,
            basePrice: value.basePrice,
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
            label="Name"
            placeholder="e.g. Combo Meal, Family Bundle"
            field={field}
          />
        )}
      </form.Field>

      <form.Field name="basePrice">
        {(field) => (
          <InputField
            label="Base Price"
            placeholder="0.00"
            field={field}
            required
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
          {isEditing ? "Update Offer" : "Create Offer"}
        </Button>
      </div>
    </form>
  );
};
