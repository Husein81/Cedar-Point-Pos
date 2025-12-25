import { Icon, Skeleton } from "@repo/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: string;
  isLoading?: boolean;
}

export function MetricCard({ title, value, icon, isLoading }: MetricCardProps) {
  return (
    <Card className="bg-white border-[#5d9eff]/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-[#525ff9]">
            <Icon name={icon} size={18} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-9 w-24 bg-[#5d9eff]/20" />
        ) : (
          <div className="text-3xl font-bold text-foreground">
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MetricCardSkeleton() {
  return (
    <Card className="bg-white border-[#5d9eff]/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-3 w-24 bg-[#5d9eff]/20" />
        <Skeleton className="h-5 w-5 rounded bg-[#525ff9]/20" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-24 bg-[#5d9eff]/20" />
      </CardContent>
    </Card>
  );
}
