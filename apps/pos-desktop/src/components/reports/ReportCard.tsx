// ReportCard.tsx
import { Link } from "@tanstack/react-router";
import { cn, Icon } from "@repo/ui";

type Props = {
  title: string;
  description: string;
  icon: string;
  to: string;
};

export const ReportCard = ({ title, description, icon, to }: Props) => {
  return (
    <Link
      to={to}
      className={cn(
        "group rounded-md border border-border bg-background p-4",
        "hover:bg-accent/40 hover:border-primary/40",
        "transition-all cursor-pointer",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-muted p-2 group-hover:bg-primary/15">
          <Icon
            name={icon}
            className="h-5 w-5 text-muted-foreground group-hover:text-primary"
          />
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
};
