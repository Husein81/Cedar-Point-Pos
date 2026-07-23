import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Label, Shad } from "@repo/ui";
import { FormField } from "@/components/common/FormField";
import { useCreateUser, useUpdateUser } from "@/hooks/useUsers";
import { UserRole } from "@/shared/enums";
import { UserSchema } from "@/shared/schemas";
import type { User } from "@/shared/models";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
};

// Edit mode: password optional (blank = keep current).
const EditUserSchema = UserSchema.extend({
  password: z
    .string()
    .refine((value) => value === "" || value.length >= 4, {
      message: "Password must be at least 4 characters",
    }),
});

type EmployeeFormValues = z.infer<typeof EditUserSchema>;

export const EmployeeForm = ({ open, onOpenChange, user }: Props) => {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(user ? EditUserSchema : UserSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      role: UserRole.CASHIER,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: user?.name ?? "",
        username: user?.username ?? "",
        password: "",
        role: user?.role ?? UserRole.CASHIER,
      });
    }
  }, [open, user, reset]);

  const onSubmit = async (value: EmployeeFormValues) => {
    if (user) {
      await updateUser.mutateAsync({
        id: user.id,
        data: {
          name: value.name,
          username: value.username,
          role: value.role,
          ...(value.password ? { password: value.password } : {}),
        },
      });
    } else {
      await createUser.mutateAsync(value);
    }
    onOpenChange(false);
  };

  return (
    <Shad.Dialog open={open} onOpenChange={onOpenChange}>
      <Shad.DialogContent className="max-w-sm">
        <Shad.DialogHeader>
          <Shad.DialogTitle>
            {user ? "Edit Employee" : "New Employee"}
          </Shad.DialogTitle>
        </Shad.DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Name"
            registration={register("name")}
            error={errors.name}
            autoFocus
            required
          />
          <FormField
            label="Username"
            registration={register("username")}
            error={errors.username}
            required
          />
          <FormField
            label={user ? "New Password (blank = keep)" : "Password"}
            type="password"
            registration={register("password")}
            error={errors.password}
            required={!user}
          />

          <div className="space-y-2">
            <Label>Role</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Shad.Select value={field.value} onValueChange={field.onChange}>
                  <Shad.SelectTrigger className="w-full">
                    <Shad.SelectValue />
                  </Shad.SelectTrigger>
                  <Shad.SelectContent>
                    <Shad.SelectItem value={UserRole.OWNER}>
                      Owner
                    </Shad.SelectItem>
                    <Shad.SelectItem value={UserRole.MANAGER}>
                      Manager
                    </Shad.SelectItem>
                    <Shad.SelectItem value={UserRole.CASHIER}>
                      Cashier
                    </Shad.SelectItem>
                  </Shad.SelectContent>
                </Shad.Select>
              )}
            />
          </div>

          <Shad.DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} isSubmitting={isSubmitting}>
              {user ? "Save" : "Create"}
            </Button>
          </Shad.DialogFooter>
        </form>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
