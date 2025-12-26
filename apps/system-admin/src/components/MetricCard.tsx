import { Icon, Skeleton, Shad } from "@repo/ui";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: string;
  isLoading?: boolean;
}

export function MetricCard({ title, value, icon, isLoading }: MetricCardProps) {
  return (
    <Shad.Card className="bg-white border-[#5d9eff]/20">
      <Shad.CardHeader className="flex flex-row items-center justify-between pb-2">
        <Shad.CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </Shad.CardTitle>
        {icon && (
          <div className="text-[#525ff9]">
            <Icon name={icon} size={18} />
          </div>
        )}
      </Shad.CardHeader>
      <Shad.CardContent>
        {isLoading ? (
          <Skeleton className="h-9 w-24 bg-[#5d9eff]/20" />
        ) : (
          <div className="text-3xl font-bold text-foreground">
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
        )}
      </Shad.CardContent>
    </Shad.Card>
  );
}

export function MetricCardSkeleton() {
  return (
    <Shad.Card className="bg-white border-[#5d9eff]/20">
      <Shad.CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-3 w-24 bg-[#5d9eff]/20" />
        <Skeleton className="h-5 w-5 rounded bg-[#525ff9]/20" />
      </Shad.CardHeader>
      <Shad.CardContent>
        <Skeleton className="h-9 w-24 bg-[#5d9eff]/20" />
      </Shad.CardContent>
    </Shad.Card>
  );
}
