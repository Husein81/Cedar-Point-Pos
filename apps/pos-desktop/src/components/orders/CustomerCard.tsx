import { Button, Badge, Icon } from "@repo/ui";
import { cn } from "@repo/ui";

type Props = {
  customer: {
    id: string;
    name: string;
    phone: string | null;
  };
  onRemove: () => void;
  className?: string;
};

export const CustomerCard = ({ customer, onRemove, className }: Props) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-1 rounded-sm border bg-muted/30 hover:bg-muted/50 transition-colors",
        className
      )}
    >
      {/* Customer Info */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar placeholder */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary shrink-0">
          <Icon name="User" className="w-4 h-4" />
        </div>

        {/* Name & Phone */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{customer.name}</p>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Customer
            </Badge>
          </div>
          {customer.phone && (
            <p className="text-xs text-muted-foreground truncate">
              {customer.phone}
            </p>
          )}
        </div>
      </div>

      {/* Remove Action */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={onRemove}
      >
        <Icon name="X" className="w-4 h-4" />
      </Button>
    </div>
  );
};
