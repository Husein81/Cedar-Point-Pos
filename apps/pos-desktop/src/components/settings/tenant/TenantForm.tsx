import { tenantApi } from "@/apis/tenantApi";
import { useAuthStore } from "@/store/authStore";
import { Button, InputField, Shad } from "@repo/ui";
import { useForm } from "@tanstack/react-form";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { toast } from "@repo/ui";

export function TenantForm() {
  const { user, updateUser } = useAuthStore();

  const form = useForm({
    defaultValues: {
      name: user?.tenant?.name || "",
    },
    onSubmit: async ({ value }) => {
      try {
        const updatedTenant = await tenantApi.updateMyTenant(value);
        if (user) {
          updateUser({
            ...user,
            tenant: { ...user.tenant, ...updatedTenant },
          });
        }
        toast.success("Tenant details updated successfully");
      } catch (error) {
        console.error(error);
        toast.error("Failed to update tenant details");
      }
    },
  });

  // Update form when user tenant data changes
  useEffect(() => {
    if (user?.tenant?.name) {
      form.setFieldValue("name", user.tenant.name);
    }
  }, [user?.tenant?.name]);

  return (
    <Shad.Card>
      <Shad.CardHeader>
        <Shad.CardTitle>General Information</Shad.CardTitle>
        <Shad.CardDescription>
          Update your business name and details
        </Shad.CardDescription>
      </Shad.CardHeader>
      <Shad.CardContent>
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
                !value ? "Business name is required" : undefined,
            }}
          >
            {(field) => (
              <InputField
                label="Business Name"
                field={field}
                placeholder="Enter business name"
                required
              />
            )}
          </form.Field>

          <div className="flex justify-end pt-4">
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  isSubmitting={isSubmitting}
                  disabled={!canSubmit || isSubmitting}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </Shad.CardContent>
    </Shad.Card>
  );
}
