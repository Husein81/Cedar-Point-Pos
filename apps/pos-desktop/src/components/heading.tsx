import { Button } from "@repo/ui";
import { Link } from "@tanstack/react-router";

type Props = {
  title: string;
  subtitle?: string;
  href?: string;
  actions?: React.ReactNode;
};

const Heading = ({ title, href, subtitle, actions }: Props) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        {href && (
          <Link to={href} className="">
            <Button variant="ghost" size="sm" iconName="ArrowLeft"></Button>
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {subtitle}
          </p>
        </div>
      </div>

      {actions && <div className="mt-4 sm:mt-0">{actions}</div>}
    </div>
  );
};

export default Heading;
