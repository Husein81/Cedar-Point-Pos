import { Shad, Icon } from "@repo/ui";
import type { TableStats } from "@/dto/tables.dto";
import { getStatsCards } from "./config";

type Props = {
  stats?: TableStats;
};

export function TablesStatsCards({ stats }: Props) {
  const statsCards = getStatsCards(stats!);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statsCards.map((stat) => (
        <Shad.Card key={stat.title}>
          <Shad.CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold mt-1">{stat.count}</p>
              </div>
              <div
                className={`h-11 w-11 rounded-full flex items-center justify-center ${stat.iconBg}`}
              >
                <Icon
                  name={stat.icon}
                  className={`h-5 w-5 ${stat.iconColor}`}
                />
              </div>
            </div>
          </Shad.CardContent>
        </Shad.Card>
      ))}
    </div>
  );
}
