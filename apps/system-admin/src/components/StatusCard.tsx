import { Icon, Skeleton } from "@repo/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

type StatusVariant = "default" | "success" | "warning" | "info";

interface StatusCardProps {
  title: string;
  value: string | number;
  icon?: string;
  variant?: StatusVariant;
  isLoading?: boolean;
}

const variantStyles: Record<
  StatusVariant,
  { card: string; value: string; icon: string }
> = {
  default: {
    card: "bg-white border-[#5d9eff]/20",
    value: "text-foreground",
    icon: "text-[#525ff9]",
  },
  success: {
    card: "bg-amber-50 border-amber-200",
    value: "text-amber-600",
    icon: "text-amber-500",
  },
  warning: {
    card: "bg-amber-50 border-amber-200",
    value: "text-amber-600",
    icon: "text-amber-500",
  },
  info: {
    card: "bg-white border-[#5d9eff]/20",
    value: "text-[#525ff9]",
    icon: "text-[#5d9eff]",
  },
};

export function StatusCard({
  title,
  value,
  icon,
  variant = "default",
  isLoading,
}: StatusCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={styles.card}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className={styles.icon}>
            <Icon name={icon} size={18} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16 bg-[#5d9eff]/20" />
        ) : (
          <div className={`text-2xl font-bold ${styles.value}`}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StatusCardSkeleton() {
  return (
    <Card className="bg-white border-[#5d9eff]/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-3 w-28 bg-[#5d9eff]/20" />
        <Skeleton className="h-5 w-5 rounded bg-[#525ff9]/20" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 bg-[#5d9eff]/20" />
      </CardContent>
    </Card>
  );
}
