import { NON_POS_ROLES, ROLE_LABELS } from "@/constants/staff";
import type { StaffView } from "@/dto/staff.dto";
import { useBranches } from "@/hooks/useBranch";
import { useCreateStaff, useUpdateStaff } from "@/hooks/useStaff";
import { useAuthStore } from "@/store/authStore";
import { useModalStore } from "@/store/modalStore";
import type { CreateStaffInput, UpdateStaffInput } from "@repo/types";
import { assignableRolesFor, UserRole } from "@repo/types";
import {
  Button,
  Combobox,
  InputField,
  Label,
  SelectField,
  SwitchField,
} from "@repo/ui";
import { useForm } from "@tanstack/react-form";

type Props = {
  staff?: StaffView;
};

const PIN_PATTERN = /^\d{4,6}$/;

export const StaffForm = ({ staff }: Props) => {
  const closeModal = useModalStore((state) => state.closeModal);
  const actorRole = useAuthStore((state) => state.user?.role);
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();
  const { data: branches, isLoading: branchesLoading } = useBranches();

  const isEdit = !!staff;
  const roleOptions = (actorRole ? assignableRolesFor(actorRole) : []).map(
    (role) => ({ value: role, label: ROLE_LABELS[role] }),
  );
  const branchOptions = (branches ?? []).map((branch) => ({
    value: branch.id,
    label: branch.name,
  }));

  const form = useForm({
    defaultValues: {
      name: staff?.name ?? "",
      username: staff?.username ?? "",
      password: "",
      role: staff?.role ?? UserRole.CASHIER,
      branchId: staff?.branchId ?? "",
      email: staff?.email ?? "",
      phone: staff?.phone ?? "",
      pin: "",
      hasPosAccess: staff?.hasPosAccess ?? true,
    },
    onSubmit: async ({ value }) => {
      try {
        if (staff) {
          const data: UpdateStaffInput = {
            name: value.name,
            role: value.role as UserRole,
            branchId: value.branchId || null,
            email: value.email || null,
            phone: value.phone || null,
          };
          await updateMutation.mutateAsync({ id: staff.id, data });
        } else {
          const data: CreateStaffInput = {
            name: value.name,
            username: value.username,
            password: value.password,
            role: value.role as UserRole,
            hasPosAccess: value.hasPosAccess,
            branchId: value.branchId || undefined,
            email: value.email || undefined,
            phone: value.phone || undefined,
            pin: value.pin || undefined,
          };
          await createMutation.mutateAsync(data);
        }
        closeModal();
      } catch {
        // Errors are surfaced through the mutation's onError toast.
      }
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

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
        name="name"
        validators={{
          onChange: ({ value }) =>
            !value || value.trim().length === 0
              ? "Name is required"
              : undefined,
        }}
      >
        {(field) => (
          <InputField
            label="Name"
            field={field}
            placeholder="Full name"
            required
          />
        )}
      </form.Field>

      {isEdit ? (
        <div className="space-y-2">
          <Label>Username</Label>
          <p className="text-sm text-muted-foreground">@{staff?.username}</p>
        </div>
      ) : (
        <>
          <form.Field
            name="username"
            validators={{
              onChange: ({ value }) =>
                !value || value.trim().length < 3
                  ? "Username must be at least 3 characters"
                  : undefined,
            }}
          >
            {(field) => (
              <InputField
                label="Username"
                field={field}
                placeholder="Login username"
                required
              />
            )}
          </form.Field>

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
                label="Password"
                field={field}
                type="password"
                placeholder="Initial password"
                required
              />
            )}
          </form.Field>
        </>
      )}

      <form.Field name="role">
        {(field) => (
          <SelectField
            label="Role"
            field={field}
            options={roleOptions}
            placeholder="Select a role"
            onChange={(opt) => {
              // POS access is off by default for non-register roles on create.
              if (!isEdit && NON_POS_ROLES.includes(opt.value as UserRole)) {
                form.setFieldValue("hasPosAccess", false);
              }
            }}
          />
        )}
      </form.Field>

      <form.Field name="branchId">
        {(field) => (
          <div className="space-y-2">
            <Label>Branch</Label>
            <Combobox
              options={branchOptions}
              value={field.state.value || null}
              onValueChange={(value) => field.handleChange(value ?? "")}
              placeholder="Select a branch (optional)"
              isLoading={branchesLoading}
              className="w-full"
            />
          </div>
        )}
      </form.Field>

      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) =>
            value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
              ? "Enter a valid email"
              : undefined,
        }}
      >
        {(field) => (
          <InputField
            label="Email"
            field={field}
            type="email"
            placeholder="name@example.com"
          />
        )}
      </form.Field>

      <form.Field name="phone">
        {(field) => (
          <InputField label="Phone" field={field} placeholder="Phone number" />
        )}
      </form.Field>

      {!isEdit && (
        <form.Field
          name="pin"
          validators={{
            onChange: ({ value }) =>
              value && !PIN_PATTERN.test(value)
                ? "PIN must be 4 to 6 digits"
                : undefined,
          }}
        >
          {(field) => (
            <InputField
              label="POS PIN"
              field={field}
              inputMode="numeric"
              maxLength={6}
              placeholder="Optional — 4 to 6 digits"
              subLabel="Set now or later from the staff profile."
            />
          )}
        </form.Field>
      )}

      {/* POS access is set on create; afterwards it's toggled via the
          dedicated endpoint (UpdateStaffSchema doesn't accept it). */}
      {!isEdit && (
        <form.Field name="hasPosAccess">
          {(field) => <SwitchField label="POS register access" field={field} />}
        </form.Field>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={closeModal}>
          Cancel
        </Button>
        <Button type="submit" isSubmitting={isPending} disabled={isPending}>
          {isEdit ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
};
