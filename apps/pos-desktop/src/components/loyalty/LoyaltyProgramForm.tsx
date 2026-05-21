import { useForm } from "@tanstack/react-form";
import { useLoyaltyProgram, useUpdateLoyaltyProgram } from "@/hooks/useLoyalty";
import type { UpdateLoyaltyProgramDto } from "@/dto/loyalty.dto";
import {
  Button,
  Icon,
  InputField,
  SelectField,
  SwitchField,
  Shad,
  Skeleton,
} from "@repo/ui";
import { toast } from "@repo/ui";
import { useEffect } from "react";

const ENROLLMENT_MODE_OPTIONS = [
  { value: "AUTO", label: "Auto — enroll on first order" },
  { value: "MANUAL", label: "Manual — staff enrolls customer" },
  { value: "INVITE_ONLY", label: "Invite Only — admin invites" },
];

type Props = {
  /** If false, render read-only view with permission message */
  canEdit: boolean;
};

export const LoyaltyProgramForm = ({ canEdit }: Props) => {
  const { data: program, isLoading, isError } = useLoyaltyProgram();
  const updateProgram = useUpdateLoyaltyProgram();

  const form = useForm({
    defaultValues: {
      isEnabled: false,
      enrollmentMode: "AUTO" as string,
      earnPointsPerCurrency: "",
      redeemPointsStep: "",
      redeemCurrencyPerStep: "",
      minRedeemPoints: "0",
      maxRedeemPercent: "",
      allowNoCustomerAccrual: false,
      pointsExpirationDays: "",
    },
    onSubmit: async ({ value }) => {
      const payload: UpdateLoyaltyProgramDto = {
        isEnabled: value.isEnabled,
        enrollmentMode:
          value.enrollmentMode as UpdateLoyaltyProgramDto["enrollmentMode"],
        earnPointsPerCurrency: value.earnPointsPerCurrency
          ? parseFloat(value.earnPointsPerCurrency)
          : undefined,
        redeemPointsStep: value.redeemPointsStep
          ? parseInt(value.redeemPointsStep, 10)
          : undefined,
        redeemCurrencyPerStep: value.redeemCurrencyPerStep
          ? parseFloat(value.redeemCurrencyPerStep)
          : undefined,
        minRedeemPoints: value.minRedeemPoints
          ? parseInt(value.minRedeemPoints, 10)
          : 0,
        maxRedeemPercent: value.maxRedeemPercent
          ? parseFloat(value.maxRedeemPercent)
          : undefined,
        allowNoCustomerAccrual: value.allowNoCustomerAccrual,
        pointsExpirationDays: value.pointsExpirationDays
          ? parseInt(value.pointsExpirationDays, 10)
          : null,
      };

      try {
        await updateProgram.mutateAsync(payload);
        toast.success("Loyalty program updated successfully");
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message || "Failed to update loyalty program",
        );
      }
    },
  });

  // Seed form when program data loads
  useEffect(() => {
    if (!program) return;
    form.setFieldValue("isEnabled", program.isEnabled);
    form.setFieldValue("enrollmentMode", program.enrollmentMode);
    form.setFieldValue(
      "earnPointsPerCurrency",
      program.earnPointsPerCurrency?.toString() ?? "",
    );
    form.setFieldValue(
      "redeemPointsStep",
      program.redeemPointsStep?.toString() ?? "",
    );
    form.setFieldValue(
      "redeemCurrencyPerStep",
      program.redeemCurrencyPerStep?.toString() ?? "",
    );
    form.setFieldValue(
      "minRedeemPoints",
      program.minRedeemPoints?.toString() ?? "0",
    );
    form.setFieldValue(
      "maxRedeemPercent",
      program.maxRedeemPercent?.toString() ?? "",
    );
    form.setFieldValue(
      "allowNoCustomerAccrual",
      program.allowNoCustomerAccrual,
    );
    form.setFieldValue(
      "pointsExpirationDays",
      program.pointsExpirationDays?.toString() ?? "",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program]);

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  // ── Error state ──
  if (isError) {
    return (
      <div className="flex items-center gap-2 text-destructive p-4">
        <Icon name="AlertTriangle" className="w-5 h-5" />
        <span>Failed to load loyalty program configuration.</span>
      </div>
    );
  }

  // ── Read-only view for non-admin ──
  if (!canEdit) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Icon
            name="ShieldAlert"
            className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5"
          />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              View Only
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Only Admins and Managers can edit the loyalty program settings.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnlyItem
            label="Status"
            value={program?.isEnabled ? "Enabled" : "Disabled"}
          />
          <ReadOnlyItem
            label="Enrollment"
            value={program?.enrollmentMode ?? "—"}
          />
          <ReadOnlyItem
            label="Earn pts / currency"
            value={program?.earnPointsPerCurrency?.toString() ?? "—"}
          />
          <ReadOnlyItem
            label="Redeem step (pts)"
            value={program?.redeemPointsStep?.toString() ?? "—"}
          />
          <ReadOnlyItem
            label="Redeem value / step"
            value={program?.redeemCurrencyPerStep?.toString() ?? "—"}
          />
          <ReadOnlyItem
            label="Min. redeem pts"
            value={program?.minRedeemPoints?.toString() ?? "0"}
          />
          <ReadOnlyItem
            label="Max redeem %"
            value={
              program?.maxRedeemPercent != null
                ? `${program.maxRedeemPercent}%`
                : "—"
            }
          />
          <ReadOnlyItem
            label="Guest accrual"
            value={program?.allowNoCustomerAccrual ? "Yes" : "No"}
          />
          <ReadOnlyItem
            label="Expiry (days)"
            value={program?.pointsExpirationDays?.toString() ?? "Never"}
          />
        </div>
      </div>
    );
  }

  // ── Editable form ──
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-6"
    >
      {/* Enable / Disable toggle */}
      <Shad.Card>
        <Shad.CardContent className="pt-6">
          <form.Field name="isEnabled">
            {(field) => (
              <SwitchField label="Enable Loyalty Program" field={field} />
            )}
          </form.Field>
        </Shad.CardContent>
      </Shad.Card>

      {/* Enrollment */}
      <Shad.Card>
        <Shad.CardHeader>
          <Shad.CardTitle className="text-base">Enrollment</Shad.CardTitle>
        </Shad.CardHeader>
        <Shad.CardContent className="space-y-4">
          <form.Field name="enrollmentMode">
            {(field) => (
              <SelectField
                label="Enrollment Mode"
                field={field}
                options={ENROLLMENT_MODE_OPTIONS}
                placeholder="Select enrollment mode"
              />
            )}
          </form.Field>

          <form.Field name="allowNoCustomerAccrual">
            {(field) => (
              <SwitchField
                label="Allow Guest Accrual (no customer required)"
                field={field}
              />
            )}
          </form.Field>
        </Shad.CardContent>
      </Shad.Card>

      {/* Earn Rules */}
      <Shad.Card>
        <Shad.CardHeader>
          <Shad.CardTitle className="text-base">Earn Rules</Shad.CardTitle>
          <Shad.CardDescription>
            How many points a customer earns per unit of currency spent.
          </Shad.CardDescription>
        </Shad.CardHeader>
        <Shad.CardContent>
          <form.Field
            name="earnPointsPerCurrency"
            validators={{
              onChange: ({ value, fieldApi }) => {
                const isEnabled = fieldApi.form.getFieldValue("isEnabled");
                if (isEnabled && (!value || parseFloat(value) <= 0)) {
                  return "Must be > 0 when program is enabled";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <InputField
                label="Points per Currency Unit"
                placeholder="e.g. 1.5"
                field={field}
                type="number"
                step="any"
                min="0"
              />
            )}
          </form.Field>
        </Shad.CardContent>
      </Shad.Card>

      {/* Redeem Rules */}
      <Shad.Card>
        <Shad.CardHeader>
          <Shad.CardTitle className="text-base">
            Redemption Rules
          </Shad.CardTitle>
          <Shad.CardDescription>
            Configure how points can be redeemed for discounts.
          </Shad.CardDescription>
        </Shad.CardHeader>
        <Shad.CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <form.Field
              name="redeemPointsStep"
              validators={{
                onChange: ({ value, fieldApi }) => {
                  const isEnabled = fieldApi.form.getFieldValue("isEnabled");
                  if (isEnabled && (!value || parseInt(value, 10) <= 0)) {
                    return "Must be > 0 when program is enabled";
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <InputField
                  label="Points per Step"
                  placeholder="e.g. 100"
                  field={field}
                  type="number"
                  step="1"
                  min="1"
                />
              )}
            </form.Field>

            <form.Field
              name="redeemCurrencyPerStep"
              validators={{
                onChange: ({ value, fieldApi }) => {
                  const isEnabled = fieldApi.form.getFieldValue("isEnabled");
                  if (isEnabled && (!value || parseFloat(value) <= 0)) {
                    return "Must be > 0 when program is enabled";
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <InputField
                  label="Currency per Step"
                  placeholder="e.g. 1.00"
                  field={field}
                  type="number"
                  step="any"
                  min="0"
                />
              )}
            </form.Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <form.Field
              name="minRedeemPoints"
              validators={{
                onChange: ({ value }) => {
                  if (value && parseInt(value, 10) < 0) {
                    return "Must be >= 0";
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <InputField
                  label="Minimum Redeemable Points"
                  placeholder="e.g. 0"
                  field={field}
                  type="number"
                  step="1"
                  min="0"
                />
              )}
            </form.Field>

            <form.Field
              name="maxRedeemPercent"
              validators={{
                onChange: ({ value, fieldApi }) => {
                  const isEnabled = fieldApi.form.getFieldValue("isEnabled");
                  if (isEnabled) {
                    if (!value) return "Required when program is enabled";
                    const num = parseFloat(value);
                    if (num < 0 || num > 100) {
                      return "Must be between 0 and 100";
                    }
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <InputField
                  label="Max Redeem % of Order"
                  placeholder="e.g. 50"
                  field={field}
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                />
              )}
            </form.Field>
          </div>
        </Shad.CardContent>
      </Shad.Card>

      {/* Expiration */}
      <Shad.Card>
        <Shad.CardHeader>
          <Shad.CardTitle className="text-base">Expiration</Shad.CardTitle>
          <Shad.CardDescription>
            Leave empty for points that never expire.
          </Shad.CardDescription>
        </Shad.CardHeader>
        <Shad.CardContent>
          <form.Field name="pointsExpirationDays">
            {(field) => (
              <InputField
                label="Expiration Days"
                placeholder="e.g. 365 (blank = never)"
                field={field}
                type="number"
                step="1"
                min="1"
              />
            )}
          </form.Field>
        </Shad.CardContent>
      </Shad.Card>

      {/* Save button */}
      <div className="flex justify-end">
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              iconName="Save"
              disabled={!canSubmit || isSubmitting || updateProgram.isPending}
            >
              {updateProgram.isPending ? "Saving…" : "Save Changes"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
};

// ── Helper: read-only field ──

function ReadOnlyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}
