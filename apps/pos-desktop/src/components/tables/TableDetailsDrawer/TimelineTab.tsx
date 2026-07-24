import { Icon } from "@repo/ui";
import { EmptyTab } from ".";
import { ActiveTableOrder, TableOverview } from "@/dto/tables.dto";
import { useBaseCurrency } from "@/hooks/useCurrency";
import { memo, useMemo } from "react";

interface TimelineEvent {
  at: number;
  label: string;
  icon: string;
}

export const TimelineTab = memo(function TimelineTab({
  summary,
  fullOrder,
}: {
  summary: TableOverview["activeOrder"];
  fullOrder: ActiveTableOrder | null;
}) {
  const { format: formatMoney } = useBaseCurrency();
  const events = useMemo<TimelineEvent[]>(() => {
    if (!summary) return [];
    const list: TimelineEvent[] = [
      {
        at: new Date(summary.createdAt).getTime(),
        label: "Guests seated · order created",
        icon: "Users",
      },
    ];

    if (fullOrder?.items) {
      let firstSent: number | null = null;
      let lastReady: number | null = null;
      for (const item of fullOrder.items) {
        for (const ticket of item.tickets ?? []) {
          const sent = new Date(ticket.sentAt).getTime();
          if (firstSent === null || sent < firstSent) firstSent = sent;
          if (ticket.bumpedAt) {
            const bumped = new Date(ticket.bumpedAt).getTime();
            if (lastReady === null || bumped > lastReady) lastReady = bumped;
          }
        }
      }
      if (firstSent !== null) {
        list.push({ at: firstSent, label: "Sent to kitchen", icon: "ChefHat" });
      }
      if (lastReady !== null) {
        list.push({ at: lastReady, label: "Kitchen ready", icon: "BellRing" });
      }
    }

    for (const payment of fullOrder?.payments ?? []) {
      list.push({
        at: new Date(payment.paidAt).getTime(),
        label: `Payment · ${payment.method} ${formatMoney(payment.amount)}`,
        icon: "CreditCard",
      });
    }

    return list
      .filter((e) => Number.isFinite(e.at))
      .sort((a, b) => a.at - b.at);
  }, [fullOrder, summary, formatMoney]);

  if (events.length === 0) {
    return <EmptyTab icon="History" text="No activity yet" />;
  }

  return (
    <ol className="relative ml-2 space-y-4 border-l pl-5">
      {events.map((event, index) => (
        <li key={`${event.at}-${index}`} className="relative">
          <span className="bg-card absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full border">
            <Icon name={event.icon} className="text-muted-foreground h-3 w-3" />
          </span>
          <p className="text-sm font-medium">{event.label}</p>
          <p className="text-muted-foreground text-xs">
            {new Date(event.at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </li>
      ))}
    </ol>
  );
});
