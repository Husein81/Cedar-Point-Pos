import { cn, Icon } from "@repo/ui";

type Props = {
  decimalsAllowed: boolean;
  showDiff: boolean;
  isDiffActive: boolean;
  onDigit: (digit: number) => void;
  onDoubleZero: () => void;
  onDecimal: () => void;
  onBackspace: () => void;
  onClear: () => void;
  onConfirm: () => void;
  onDiff: () => void;
};

type KeyVariant = "digit" | "utility" | "confirm";

const Key = ({
  children,
  variant = "digit",
  ariaLabel,
  disabled,
  active,
  className,
  onClick,
}: {
  children: React.ReactNode;
  variant?: KeyVariant;
  ariaLabel: string;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "flex h-12 select-none items-center justify-center rounded-lg text-lg font-semibold",
      "transition-all duration-75 active:scale-95",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "disabled:pointer-events-none disabled:opacity-30",
      variant === "digit" &&
        "border border-border/60 bg-background text-foreground hover:bg-muted",
      variant === "utility" &&
        "border border-border/60 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
      variant === "confirm" &&
        "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
      active && "border-primary/40 bg-primary/10 text-primary",
      className,
    )}
  >
    {children}
  </button>
);

export default function KeypadGrid({
  decimalsAllowed,
  showDiff,
  isDiffActive,
  onDigit,
  onDoubleZero,
  onDecimal,
  onBackspace,
  onClear,
  onConfirm,
  onDiff,
}: Props) {
  return (
    <div className="grid grid-cols-4 gap-1.5 p-2 pt-1">
      <Key ariaLabel="1" onClick={() => onDigit(1)}>
        1
      </Key>
      <Key ariaLabel="2" onClick={() => onDigit(2)}>
        2
      </Key>
      <Key ariaLabel="3" onClick={() => onDigit(3)}>
        3
      </Key>
      <Key ariaLabel="Backspace" variant="utility" onClick={onBackspace}>
        <Icon name="Delete" className="h-5 w-5" />
      </Key>

      <Key ariaLabel="4" onClick={() => onDigit(4)}>
        4
      </Key>
      <Key ariaLabel="5" onClick={() => onDigit(5)}>
        5
      </Key>
      <Key ariaLabel="6" onClick={() => onDigit(6)}>
        6
      </Key>
      <Key ariaLabel="Clear entry" variant="utility" onClick={onClear}>
        C
      </Key>

      <Key ariaLabel="7" onClick={() => onDigit(7)}>
        7
      </Key>
      <Key ariaLabel="8" onClick={() => onDigit(8)}>
        8
      </Key>
      <Key ariaLabel="9" onClick={() => onDigit(9)}>
        9
      </Key>
      <Key
        ariaLabel="Apply"
        variant="confirm"
        className="row-span-2 h-auto"
        onClick={onConfirm}
      >
        <Icon name="Check" className="h-6 w-6" />
      </Key>

      {showDiff ? (
        <Key
          ariaLabel="Add difference to current price"
          variant="utility"
          active={isDiffActive}
          onClick={onDiff}
        >
          <Icon name="Diff" className="h-5 w-5" />
        </Key>
      ) : (
        <Key ariaLabel="Double zero" onClick={onDoubleZero}>
          00
        </Key>
      )}
      <Key ariaLabel="0" onClick={() => onDigit(0)}>
        0
      </Key>
      <Key
        ariaLabel="Decimal point"
        disabled={!decimalsAllowed}
        onClick={onDecimal}
      >
        .
      </Key>
    </div>
  );
}
