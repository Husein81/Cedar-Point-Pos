import { Icon } from "@repo/ui";
import { Link } from "@tanstack/react-router";

type Props = {
  title: string;
  subtitle?: string;
  href?: string;
  actions?: React.ReactNode;
};

const TitleBar = ({ title, subtitle, href, actions }: Props) => {
  return (
    <div className="flex flex-col gap-4 pt-4">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row py-2 sm:items-center sm:justify-between">
        {/* Left section */}
        <div className="flex items-center">
          {href && (
            <Link to={href} className="rounded-lg py-1.5 px-2 mr-4">
              <Icon name="ArrowLeft" className="size-5" />
            </Link>
          )}

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>

            {subtitle && (
              <p className="text-xs text-muted-foreground max-w-xl">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right section */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};

export default TitleBar;
