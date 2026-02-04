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
      {/* Total Tables Card */}
      {statsCards.map((stat) => (
        <Shad.Card className="bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <Shad.CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold">{stat.count}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <Icon
                  name={stat.icon}
                  className="h-6 w-6 text-slate-600 dark:text-slate-300"
                />
              </div>
            </div>
          </Shad.CardContent>
        </Shad.Card>
      ))}
    </div>
  );
}
