import { Button, cn } from "@repo/ui";

type Props = {
  active?: boolean;
  label: string;
  badge?: number;
  onClick?: () => void;
};

export function FloorTab({ active, label, badge, onClick }: Props) {
  return (
    <Button onClick={onClick} variant={active ? "default" : "outline"}>
      <span>{label}</span>

      {typeof badge === "number" && (
        <div
          className={cn(
            "min-w-5 h-5 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center bg-muted text-black",
          )}
        >
          {badge}
        </div>
      )}
    </Button>
  );
}
