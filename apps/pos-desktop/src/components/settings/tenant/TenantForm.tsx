import { tenantApi } from "@/apis/tenantApi";
import { useUploadTenantLogo } from "@/hooks/useUploadImage";
import { useAuthStore } from "@/store/authStore";
import { Button, Icon, Input, InputField, Shad } from "@repo/ui";
import { useForm } from "@tanstack/react-form";
import { Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "@repo/ui";

export function TenantForm() {
  const { user, updateUser } = useAuthStore();
  const uploadLogo = useUploadTenantLogo();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    user?.tenant?.logoUrl || null,
  );
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const form = useForm({
    defaultValues: {
      name: user?.tenant?.name || "",
    },
    onSubmit: async ({ value }) => {
      try {
        // Resolve the logo field to persist: upload a newly-selected file, clear
        // an explicitly removed logo, or leave the existing one untouched.
        const logoFields: { logoUrl?: string | null } = {};
        if (logoFile) {
          setIsUploadingLogo(true);
          try {
            const { url } = await uploadLogo.mutateAsync(logoFile);
            logoFields.logoUrl = url;
          } catch {
            // useUploadTenantLogo already surfaced the error toast.
            setIsUploadingLogo(false);
            return;
          } finally {
            setIsUploadingLogo(false);
          }
        } else if (!logoPreview && user?.tenant?.logoUrl) {
          logoFields.logoUrl = null;
        }

        const updatedTenant = await tenantApi.updateMyTenant({
          ...value,
          ...logoFields,
        });
        if (user) {
          updateUser({
            ...user,
            tenant: { ...user.tenant, ...updatedTenant },
          });
        }
        setLogoFile(null);
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

          {/* Logo — printed on receipts when set */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Logo</label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative w-24 h-24">
                  <img
                    src={logoPreview}
                    alt="Tenant logo"
                    className="w-24 h-24 object-contain rounded-lg border bg-muted"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview(null);
                    }}
                  >
                    <Icon name="X" className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                  <Icon name="Image" className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setLogoFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setLogoPreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                  id="tenant-logo-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  iconName="Upload"
                >
                  {logoPreview ? "Change Logo" : "Upload Logo"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Recommended: Square image, max 5MB
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  isSubmitting={isSubmitting || isUploadingLogo}
                  disabled={!canSubmit || isSubmitting || isUploadingLogo}
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
