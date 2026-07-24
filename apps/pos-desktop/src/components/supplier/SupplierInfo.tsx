import { Icon, Shad } from "@repo/ui";
import type { SupplierFullDetails } from "@/dto/supplier.dto";
import { DEFAULT_LOCALE } from "@/constants/locale";
import { useBaseCurrency } from "@/hooks/useCurrency";

interface SupplierInfoProps {
  supplier: SupplierFullDetails;
}

export const SupplierInfo = ({ supplier }: SupplierInfoProps) => {
  const { format: formatMoney } = useBaseCurrency();

  return (
    <Shad.Card>
      <Shad.CardHeader>
        <Shad.CardTitle>Supplier Information</Shad.CardTitle>
      </Shad.CardHeader>
      <Shad.CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <Icon name="Phone" className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <p className="text-base">{supplier.phone || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Icon name="Mail" className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-base">{supplier.email || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Icon name="MapPin" className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-500">Address</p>
              <p className="text-base">{supplier.address || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Icon
              name="Building2"
              className="h-4 w-4 text-muted-foreground mt-1"
            />
            <div>
              <p className="text-sm font-medium text-gray-500">Company Name</p>
              <p className="text-base">{supplier.companyName || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Icon name="Tag" className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-500">Category</p>
              <p className="text-base">{supplier.category || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Icon name="Wallet" className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-500">
                Current Balance
              </p>
              <p className="text-base">
                {formatMoney(supplier.currentBalance)}
              </p>
            </div>
          </div>
        </div>

        {supplier.notes && (
          <div className="border-t pt-4">
            <div className="flex items-start gap-3">
              <Icon
                name="StickyNote"
                className="h-4 w-4 text-muted-foreground mt-1"
              />
              <div>
                <p className="text-sm font-medium text-gray-500">Notes</p>
                <p className="text-base">{supplier.notes}</p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Supplier Since
              </p>
              <p className="text-base">
                {new Date(supplier.createdAt).toLocaleDateString(DEFAULT_LOCALE, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Last Updated</p>
              <p className="text-base">
                {new Date(supplier.updatedAt).toLocaleDateString(DEFAULT_LOCALE, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </Shad.CardContent>
    </Shad.Card>
  );
};
