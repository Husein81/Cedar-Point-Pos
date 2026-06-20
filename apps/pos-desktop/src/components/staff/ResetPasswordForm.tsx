import { useResetStaffPassword } from "@/hooks/useStaff";
import { useModalStore } from "@/store/modalStore";
import { Button, InputField } from "@repo/ui";
import { useForm } from "@tanstack/react-form";

export const ResetPasswordForm = ({ staffId }: { staffId: string }) => {
  const closeModal = useModalStore((state) => state.closeModal);
  const resetPassword = useResetStaffPassword();

  const form = useForm({
    defaultValues: { password: "" },
    onSubmit: async ({ value }) => {
      try {
        await resetPassword.mutateAsync({
          id: staffId,
          data: { password: value.password },
        });
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
      <p className="text-sm text-muted-foreground">
        This sets a new login password and stops their existing login from being
        renewed. Share the new password with them securely.
      </p>

      <form.Field
        name="password"
        validators={{
          onChange: ({ value }) =>
            !value || value.length < 6
              ? "Password must be at least 6 characters"
              : undefined,
        }}
      >
        {(field) => (
          <InputField
            label="New password"
            field={field}
            type="password"
            placeholder="At least 6 characters"
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
          isSubmitting={resetPassword.isPending}
          disabled={resetPassword.isPending}
        >
          Reset Password
        </Button>
      </div>
    </form>
  );
};
