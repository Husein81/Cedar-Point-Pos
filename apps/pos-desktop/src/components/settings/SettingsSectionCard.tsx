import { cn, Icon, Shad } from "@repo/ui";
import { Link } from "@tanstack/react-router";
import type { SettingsSection } from "./config";

type Props = {
  section: SettingsSection;
  className?: string;
};

export const SettingsSectionCard = ({ section, className }: Props) => {
  return (
    <Link to={section.href}>
      <Shad.Card
        className={cn(
          "cursor-pointer rounded-lg transition-all hover:shadow-md hover:border-primary/50",
          "group",
          className,
        )}
      >
        <Shad.CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Icon name={section.icon} className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <Shad.CardTitle className="text-base font-medium">
              {section.label}
            </Shad.CardTitle>
            <Shad.CardDescription className="text-sm">
              {section.description}
            </Shad.CardDescription>
          </div>
          <Icon
            name="ChevronRight"
            className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors"
          />
        </Shad.CardHeader>
      </Shad.Card>
    </Link>
  );
};
