import { Button } from "@repo/ui";
import { Link } from "@tanstack/react-router";

type Props = {
  title: string;
  subtitle?: string;
  href?: string;
  actions?: React.ReactNode;
};

const Heading = ({ title, subtitle, href, actions }: Props) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumbs */}
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left section */}
        <div className="flex items-start gap-3">
          {href && (
            <Link to={href}>
              <Button
                variant="ghost"
                size="sm"
                iconName="ArrowLeft"
                className="mt-1"
              >
                Go back
              </Button>
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

export default Heading;
