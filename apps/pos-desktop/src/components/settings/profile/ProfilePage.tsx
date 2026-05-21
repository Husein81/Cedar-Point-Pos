import TitleBar from "@/components/title-bar";
import { useUpdateProfile } from "@/hooks/useUser";
import { useAuthStore } from "@/store/authStore";
import { Avatar, Badge, Button, Icon, InputField, Shad } from "@repo/ui";
import { useForm } from "@tanstack/react-form";

export default function ProfilePage() {
  const { user, isStaff } = useAuthStore();
  const updateMutation = useUpdateProfile();

  const form = useForm({
    defaultValues: {
      name: user?.name || "",
      username: user?.username || "",
      email: user?.email || "",
      phone: user?.phone || "",
      avatar: user?.avatar || "",
    },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync(value);
    },
  });

  return (
    <div className="space-y-8">
      <TitleBar
        title="Profile Settings"
        subtitle="Manage your personal information and account details"
        href="/settings"
        actions={
          <Button
            type="submit"
            size="lg"
            disabled={updateMutation.isPending || !form.state.canSubmit}
            className="min-w-[170px]"
          >
            {updateMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Icon name="LoaderCircle" className="size-4 animate-spin" />
                Saving...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Icon name="Save" className="size-4" />
                Save Changes
              </div>
            )}
          </Button>
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-8"
      >
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
          {/* LEFT SIDEBAR */}
          <Shad.Card className="h-fit border-muted/60">
            <Shad.CardContent className="px-6 pb-6">
              <div className="-mt-14 flex flex-col items-center text-center">
                <Avatar
                  src={user?.avatar || undefined}
                  fallback={user?.name || "U"}
                  className="size-24 border-4 border-background shadow-lg rounded-xl"
                />

                <div className="mt-4 space-y-1">
                  <h2 className="text-xl font-semibold capitalize">
                    {user?.name}
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    @{user?.username}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Badge
                    variant={
                      user?.isActive !== false ? "default" : "destructive"
                    }
                  >
                    <div className="flex items-center gap-1">
                      <Icon name="ShieldCheck" className="size-3.5" />
                      {user?.isActive !== false ? "Active" : "Inactive"}
                    </div>
                  </Badge>

                  <Badge variant="secondary" className="capitalize">
                    {user?.role?.toLowerCase()}
                  </Badge>
                </div>
              </div>

              <div className="mt-8 space-y-4 border-t pt-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg border bg-muted/40 p-2">
                    <Icon
                      name="Mail"
                      className="size-4 text-muted-foreground"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="truncate text-sm font-medium">
                      {user?.email || "No email"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg border bg-muted/40 p-2">
                    <Icon
                      name="Phone"
                      className="size-4 text-muted-foreground"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Phone Number
                    </p>
                    <p className="truncate text-sm font-medium">
                      {user?.phone || "No phone number"}
                    </p>
                  </div>
                </div>

                {user?.tenant && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg border bg-muted/40 p-2">
                      <Icon
                        name="Building2"
                        className="size-4 text-muted-foreground"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Business</p>
                      <p className="truncate text-sm font-medium">
                        {user.tenant.name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Shad.CardContent>
          </Shad.Card>

          {/* MAIN CONTENT */}
          <div className="space-y-6">
            {/* PERSONAL INFO */}
            <Shad.Card>
              <Shad.CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border bg-background p-2">
                    <Icon name="User" className="size-5" />
                  </div>

                  <div>
                    <Shad.CardTitle>Personal Information</Shad.CardTitle>

                    <Shad.CardDescription>
                      Update your account details and profile information
                    </Shad.CardDescription>
                  </div>
                </div>
              </Shad.CardHeader>

              <Shad.CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        label="Display Name"
                        field={field}
                        placeholder="Enter your display name"
                        required
                      />
                    )}
                  </form.Field>

                  <form.Field
                    name="username"
                    validators={{
                      onChange: ({ value }) =>
                        !value || value.trim().length === 0
                          ? "Username is required"
                          : undefined,
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
                    name="email"
                    validators={{
                      onChange: ({ value }) =>
                        value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                          ? "Invalid email address"
                          : undefined,
                    }}
                  >
                    {(field) => (
                      <InputField
                        label="Email Address"
                        field={field}
                        placeholder="test@example.com"
                        type="email"
                      />
                    )}
                  </form.Field>
                  <form.Field
                    name="phone"
                    validators={{
                      onChange: ({ value }) =>
                        value && !/^\+?[0-9]+$/.test(value)
                          ? "Invalid phone number"
                          : undefined,
                    }}
                  >
                    {(field) => (
                      <InputField
                        label="Phone Number"
                        field={field}
                        placeholder="+96170123456"
                        type="tel"
                      />
                    )}
                  </form.Field>
                </div>
              </Shad.CardContent>
            </Shad.Card>

            {/* ACCOUNT INFO */}
            <Shad.Card>
              <Shad.CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border bg-background p-2">
                    <Icon name="Shield" className="size-5" />
                  </div>

                  <div>
                    <Shad.CardTitle>Account Information</Shad.CardTitle>

                    <Shad.CardDescription>
                      Read-only information related to your account
                    </Shad.CardDescription>
                  </div>
                </div>
              </Shad.CardHeader>

              <Shad.CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 rounded-xl border p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon name="BadgeCheck" className="size-4" />
                      <span className="text-sm">Role</span>
                    </div>

                    <p className="text-base font-semibold capitalize">
                      {user?.role?.toLowerCase() || "N/A"}
                    </p>

                    {isStaff && (
                      <p className="text-xs text-muted-foreground">
                        Roles can only be changed by administrators.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 rounded-xl border p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon name="Activity" className="size-4" />
                      <span className="text-sm">Status</span>
                    </div>

                    <p className="text-base font-semibold">
                      {user?.isActive !== false ? "Active" : "Inactive"}
                    </p>
                  </div>
                </div>
              </Shad.CardContent>
            </Shad.Card>
          </div>
        </div>
      </form>
    </div>
  );
}
