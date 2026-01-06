"use client";

import { useForm } from "@tanstack/react-form";
import { Button, InputField, SelectField, Shad, Icon } from "@repo/ui";
import { useCreateTenantUser, useTenantUsers } from "@/hooks/tenant";
import { UserRole, type BusinessType } from "@repo/types";
import { tenantHasAdmin, getAvailableRoles } from "@/types/tenant";
import { useMemo } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  businessType: BusinessType;
};

export function CreateUserDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  businessType,
}: Props) {
  const createUser = useCreateTenantUser();
  const { data: users = [], isLoading: isLoadingUsers } =
    useTenantUsers(tenantId);

  // Determine if tenant has an admin
  const hasAdmin = useMemo(() => tenantHasAdmin(users), [users]);

  // Get available roles based on business type
  const availableRoles = useMemo(
    () => getAvailableRoles(businessType),
    [businessType]
  );

  // Role options for the select field
  const roleOptions = useMemo(() => {
    if (!hasAdmin) {
      // First user must be ADMIN - only show ADMIN option
      return [{ value: UserRole.ADMIN, label: "Admin" }];
    }
    return availableRoles.map((role) => ({
      value: role,
      label: role.charAt(0) + role.slice(1).toLowerCase(),
    }));
  }, [hasAdmin, availableRoles]);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      role: hasAdmin ? "" : UserRole.ADMIN,
    },
    onSubmit: async ({ value }) => {
      try {
        await createUser.mutateAsync({
          name: value.name,
          email: value.email,
          username: value.username,
          password: value.password,
          role: (hasAdmin ? value.role : UserRole.ADMIN) as UserRole,
          tenantId,
        });
        form.reset();
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to create user:", error);
      }
    },
  });

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Shad.Dialog open={open} onOpenChange={handleClose}>
      <Shad.DialogContent className="sm:max-w-lg">
        <Shad.DialogHeader>
          <Shad.DialogTitle>Create User</Shad.DialogTitle>
          <Shad.DialogDescription>
            Create a new user for <strong>{tenantName}</strong>
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        {isLoadingUsers ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="LoaderCircle" className="animate-spin" size={24} />
            <span className="ml-2 text-muted-foreground">
              Loading tenant data...
            </span>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="space-y-4"
          >
            {/* First user must be admin notice */}
            {!hasAdmin && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Icon
                  name="Info"
                  size={16}
                  className="text-blue-600 mt-0.5 shrink-0"
                />
                <p className="text-sm text-blue-800">
                  This tenant has no users. The first user <strong>must</strong>{" "}
                  be an Admin to manage the tenant.
                </p>
              </div>
            )}

            {createUser.isError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {createUser.error?.message || "Failed to create user"}
              </div>
            )}

            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Name is required" : undefined,
              }}
            >
              {(field) => (
                <InputField
                  label="Full Name"
                  field={field}
                  placeholder="Enter full name"
                  required
                />
              )}
            </form.Field>

            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return "Email is required";
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return "Invalid email address";
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <InputField
                  label="Email"
                  field={field}
                  type="email"
                  placeholder="Enter email address"
                  required
                />
              )}
            </form.Field>

            <form.Field
              name="username"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Username is required" : undefined,
              }}
            >
              {(field) => (
                <InputField
                  label="Username"
                  field={field}
                  placeholder="Enter username"
                  required
                />
              )}
            </form.Field>

            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return "Password is required";
                  if (value.length < 6)
                    return "Password must be at least 6 characters";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <InputField
                  label="Password"
                  field={field}
                  type="password"
                  placeholder="Enter password (min 6 characters)"
                  required
                />
              )}
            </form.Field>

            <form.Field
              name="role"
              validators={{
                onChange: ({ value }) => {
                  if (hasAdmin && !value) return "Role is required";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <SelectField
                    label="Role"
                    field={field}
                    options={roleOptions}
                    placeholder={hasAdmin ? "Select role" : "Admin (required)"}
                  />
                  {!hasAdmin && (
                    <p className="text-xs text-muted-foreground">
                      Role is locked to Admin for the first user
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <Shad.DialogFooter>
              <Button variant="outline" onClick={handleClose} type="button">
                Cancel
              </Button>
              <form.Subscribe selector={(state) => [state.canSubmit]}>
                {([canSubmit]) => (
                  <Button
                    type="submit"
                    disabled={!canSubmit || createUser.isPending}
                    isSubmitting={createUser.isPending}
                  >
                    Create User
                  </Button>
                )}
              </form.Subscribe>
            </Shad.DialogFooter>
          </form>
        )}
      </Shad.DialogContent>
    </Shad.Dialog>
  );
}
