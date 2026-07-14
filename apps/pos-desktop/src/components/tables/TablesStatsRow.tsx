import { Icon, Shad, cn } from "@repo/ui";
import { TABLE_UI_STATUS_CONFIG, type TablesAggregateStats } from "./config";

interface StatCard {
  label: string;
  value: number | string;
  icon: string;
  accent?: string;
}

interface TablesStatsRowProps {
  stats: TablesAggregateStats;
}

export function TablesStatsRow({ stats }: TablesStatsRowProps) {
  const cards: StatCard[] = [
    {
      label: "Available",
      value: stats.byStatus.AVAILABLE,
      icon: TABLE_UI_STATUS_CONFIG.AVAILABLE.icon,
      accent: TABLE_UI_STATUS_CONFIG.AVAILABLE.text,
    },
    {
      label: "Occupied",
      value:
        stats.byStatus.OCCUPIED +
        stats.byStatus.PREPARING +
        stats.byStatus.READY +
        stats.byStatus.BILLING,
      icon: TABLE_UI_STATUS_CONFIG.OCCUPIED.icon,
      accent: TABLE_UI_STATUS_CONFIG.OCCUPIED.text,
    },
    {
      label: "Reserved",
      value: stats.byStatus.RESERVED,
      icon: TABLE_UI_STATUS_CONFIG.RESERVED.icon,
      accent: TABLE_UI_STATUS_CONFIG.RESERVED.text,
    },
    { label: "Guests", value: stats.guests, icon: "Users" },
    { label: "Open Orders", value: stats.openOrders, icon: "ReceiptText" },
    {
      label: "Occupancy",
      value: `${stats.occupancyPercent}%`,
      icon: "Gauge",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => (
        <Shad.Card key={card.label} className="gap-0 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {card.label}
            </span>
            <Icon
              name={card.icon}
              className={cn("h-4 w-4", card.accent ?? "text-muted-foreground")}
            />
          </div>
          <p
            className={cn("mt-1 text-2xl leading-none font-bold", card.accent)}
          >
            {card.value}
          </p>
        </Shad.Card>
      ))}
    </div>
  );
}
