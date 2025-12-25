import { Icon, Skeleton } from "@repo/ui";
import { Card, CardContent } from "@repo/ui/components/card";

type AlertVariant = "warning" | "error" | "info";

interface AlertCardProps {
  title: string;
  description: string;
  icon?: string;
  variant?: AlertVariant;
  isLoading?: boolean;
}

const variantStyles: Record<
  AlertVariant,
  { card: string; icon: string; title: string }
> = {
  warning: {
    card: "bg-amber-50 border-l-4 border-l-amber-400 border-t-0 border-r-0 border-b-0",
    icon: "text-amber-500 bg-amber-100",
    title: "text-amber-700",
  },
  error: {
    card: "bg-red-50 border-l-4 border-l-red-400 border-t-0 border-r-0 border-b-0",
    icon: "text-red-500 bg-red-100",
    title: "text-red-700",
  },
  info: {
    card: "bg-[#5d9eff]/10 border-l-4 border-l-[#525ff9] border-t-0 border-r-0 border-b-0",
    icon: "text-[#525ff9] bg-[#5d9eff]/20",
    title: "text-[#525ff9]",
  },
};

export function AlertCard({
  title,
  description,
  icon = "TriangleAlert",
  variant = "warning",
  isLoading,
}: AlertCardProps) {
  const styles = variantStyles[variant];

  if (isLoading) {
    return <AlertCardSkeleton />;
  }

  return (
    <Card className={`${styles.card} rounded-lg`}>
      <CardContent className="flex items-start gap-4 py-4">
        <div className={`p-2 rounded-md ${styles.icon}`}>
          <Icon name={icon} size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold text-sm ${styles.title}`}>{title}</h4>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AlertCardSkeleton() {
  return (
    <Card className="bg-[#5d9eff]/5 rounded-lg border-[#5d9eff]/20">
      <CardContent className="flex items-start gap-4 py-4">
        <Skeleton className="h-9 w-9 rounded-md bg-[#525ff9]/20" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40 bg-[#5d9eff]/20" />
          <Skeleton className="h-3 w-64 bg-[#5d9eff]/15" />
        </div>
      </CardContent>
    </Card>
  );
}
