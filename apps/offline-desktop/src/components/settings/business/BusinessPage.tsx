import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Icon, Shad, Skeleton } from "@repo/ui";
import TitleBar from "@/components/title-bar";
import { FormField } from "@/components/common/FormField";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";

// Form-shape schema: tax entered as a percentage (11 = 11%), stored as 0.11.
const SettingsFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  phone: z.string(),
  email: z.string(),
  address: z.string(),
  currencyCode: z.string().min(1, "Currency code is required"),
  currencySymbol: z.string().min(1, "Currency symbol is required"),
  receiptFooter: z.string(),
  taxPercent: z.number().min(0).max(100),
  invoicePrefix: z.string().min(1, "Invoice prefix is required"),
  nextInvoiceNumber: z.number().int().min(1),
  printerName: z.string(),
});

type SettingsFormValues = z.infer<typeof SettingsFormSchema>;

type SectionCardProps = {
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

const SectionCard = ({
  icon,
  title,
  description,
  children,
}: SectionCardProps) => (
  <Shad.Card className="rounded-md">
    <Shad.CardHeader className="border-b">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border bg-background p-2">
          <Icon name={icon} className="size-5" />
        </div>
        <div>
          <Shad.CardTitle>{title}</Shad.CardTitle>
          <Shad.CardDescription>{description}</Shad.CardDescription>
        </div>
      </div>
    </Shad.CardHeader>
    <Shad.CardContent className="pt-6">{children}</Shad.CardContent>
  </Shad.Card>
);

export default function BusinessPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(SettingsFormSchema),
    defaultValues: {
      businessName: "",
      phone: "",
      email: "",
      address: "",
      currencyCode: "USD",
      currencySymbol: "$",
      receiptFooter: "",
      taxPercent: 0,
      invoicePrefix: "INV-",
      nextInvoiceNumber: 1,
      printerName: "",
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        businessName: settings.businessName,
        phone: settings.phone ?? "",
        email: settings.email ?? "",
        address: settings.address ?? "",
        currencyCode: settings.currencyCode,
        currencySymbol: settings.currencySymbol,
        receiptFooter: settings.receiptFooter ?? "",
        taxPercent: settings.taxRate * 100,
        invoicePrefix: settings.invoicePrefix,
        nextInvoiceNumber: settings.nextInvoiceNumber,
        printerName: settings.printerName ?? "",
      });
    }
  }, [settings, reset]);

  const onSubmit = async (value: SettingsFormValues) => {
    await updateSettings.mutateAsync({
      businessName: value.businessName,
      phone: value.phone || null,
      email: value.email || null,
      address: value.address || null,
      currencyCode: value.currencyCode,
      currencySymbol: value.currencySymbol,
      receiptFooter: value.receiptFooter || null,
      taxRate: value.taxPercent / 100,
      invoicePrefix: value.invoicePrefix,
      nextInvoiceNumber: value.nextInvoiceNumber,
      printerName: value.printerName || null,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      <TitleBar
        title="Business"
        subtitle="Business details, currency, tax and receipts"
        actions={
          <Button
            type="submit"
            formId="business-settings-form"
            size="lg"
            disabled={isSubmitting}
            className="min-w-[170px]"
          >
            {isSubmitting ? (
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
        id="business-settings-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <SectionCard
          icon="Building2"
          title="General Information"
          description="Your business name and contact details"
        >
          <div className="space-y-4">
            <FormField
              label="Business Name"
              registration={register("businessName")}
              error={errors.businessName}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Phone"
                registration={register("phone")}
                error={errors.phone}
              />
              <FormField
                label="Email"
                registration={register("email")}
                error={errors.email}
              />
            </div>
            <FormField
              label="Address"
              registration={register("address")}
              error={errors.address}
            />
          </div>
        </SectionCard>

        <SectionCard
          icon="Landmark"
          title="Currency & Tax"
          description="Set the currency and tax rate applied to sales"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              label="Currency Code"
              placeholder="USD"
              registration={register("currencyCode")}
              error={errors.currencyCode}
            />
            <FormField
              label="Currency Symbol"
              placeholder="$"
              registration={register("currencySymbol")}
              error={errors.currencySymbol}
            />
            <FormField
              label="Tax %"
              type="number"
              step="0.01"
              registration={register("taxPercent", { valueAsNumber: true })}
              error={errors.taxPercent}
            />
          </div>
        </SectionCard>

        <SectionCard
          icon="Receipt"
          title="Receipt & Invoicing"
          description="Customize invoice numbering and receipt footer"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Invoice Prefix"
                placeholder="INV-"
                registration={register("invoicePrefix")}
                error={errors.invoicePrefix}
              />
              <FormField
                label="Next Invoice Number"
                type="number"
                registration={register("nextInvoiceNumber", {
                  valueAsNumber: true,
                })}
                error={errors.nextInvoiceNumber}
              />
            </div>
            <FormField
              label="Receipt Footer"
              placeholder="Thank you for your purchase!"
              registration={register("receiptFooter")}
              error={errors.receiptFooter}
            />
            <FormField
              label="Printer Name"
              placeholder="Leave empty for system default"
              registration={register("printerName")}
              error={errors.printerName}
            />
          </div>
        </SectionCard>
      </form>
    </div>
  );
}
