import { Icon } from '@repo/ui';

interface SectionHeaderProps {
  title: string;
  icon?: string;
}

export function SectionHeader({ title, icon }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon && (
        <div className="text-muted-foreground">
          <Icon name={icon} size={16} />
        </div>
      )}
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
    </div>
  );
}

