import { useSetStaffPin } from "@/hooks/useStaff";
import { useModalStore } from "@/store/modalStore";
import { Button, InputField } from "@repo/ui";
import { useForm } from "@tanstack/react-form";

const PIN_PATTERN = /^\d{4,6}$/;

export const SetPinForm = ({ staffId }: { staffId: string }) => {
  const closeModal = useModalStore((state) => state.closeModal);
  const setPin = useSetStaffPin();

  const form = useForm({
    defaultValues: { pin: "" },
    onSubmit: async ({ value }) => {
      try {
        await setPin.mutateAsync({ id: staffId, data: { pin: value.pin } });
        closeModal();
      } catch {
        // Errors are surfaced through the mutation's onError toast.
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field
        name="pin"
        validators={{
          onChange: ({ value }) =>
            !PIN_PATTERN.test(value) ? "PIN must be 4 to 6 digits" : undefined,
        }}
      >
        {(field) => (
          <InputField
            label="New POS PIN"
            field={field}
            inputMode="numeric"
            maxLength={6}
            placeholder="4 to 6 digits"
            required
          />
        )}
      </form.Field>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          type="submit"
          isSubmitting={setPin.isPending}
          disabled={setPin.isPending}
        >
          Set PIN
        </Button>
      </div>
    </form>
  );
};
