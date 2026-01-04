type Props = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

const Heading = ({ title, subtitle, actions }: Props) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {subtitle}
        </p>
      </div>

      {actions && <div className="mt-4 sm:mt-0">{actions}</div>}
    </div>
  );
};

export default Heading;
