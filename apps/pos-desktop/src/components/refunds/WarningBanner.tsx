import { Button, cn, Icon } from "@repo/ui";
import type { RefundWarning, RefundWarningSeverity } from "@/dto/refund.dto";

interface WarningBannerProps {
  warning: RefundWarning;
  isAcknowledged: boolean;
  onAcknowledge: () => void;
}

const severityStyles: Record<
  RefundWarningSeverity,
  { bg: string; border: string; text: string; icon: string }
> = {
  INFO: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: "Info",
  },
  WARNING: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: "AlertTriangle",
  },
  MANAGER_REQUIRED: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-800",
    icon: "ShieldAlert",
  },
};

export const WarningBanner = ({
  warning,
  isAcknowledged,
  onAcknowledge,
}: WarningBannerProps) => {
  const styles = severityStyles[warning.severity];

  if (isAcknowledged && warning.severity !== "MANAGER_REQUIRED") {
    return null; // Hide acknowledged non-manager warnings
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 flex items-start gap-3 transition-opacity",
        styles.bg,
        styles.border,
        isAcknowledged && "opacity-60"
      )}
    >
      <Icon
        name={styles.icon as any}
        className={cn("h-5 w-5 shrink-0 mt-0.5", styles.text)}
      />

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", styles.text)}>
          {warning.message}
        </p>
        {warning.severity === "MANAGER_REQUIRED" && (
          <p className="text-xs text-muted-foreground mt-1">
            Requires manager approval to proceed
          </p>
        )}
      </div>

      {warning.severity === "WARNING" && !isAcknowledged && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAcknowledge}
          className="shrink-0 h-7 text-xs"
        >
          Acknowledge
        </Button>
      )}

      {isAcknowledged && warning.severity !== "MANAGER_REQUIRED" && (
        <Icon name="Check" className="h-4 w-4 text-green-600 shrink-0" />
      )}
    </div>
  );
};

interface WarningListProps {
  warnings: RefundWarning[];
  acknowledgedWarnings: string[];
  onAcknowledge: (code: string) => void;
}

export const WarningList = ({
  warnings,
  acknowledgedWarnings,
  onAcknowledge,
}: WarningListProps) => {
  if (warnings.length === 0) {
    return null;
  }

  // Sort: MANAGER_REQUIRED first, then WARNING, then INFO
  const sortedWarnings = [...warnings].sort((a, b) => {
    const order: Record<RefundWarningSeverity, number> = {
      MANAGER_REQUIRED: 0,
      WARNING: 1,
      INFO: 2,
    };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="space-y-2">
      {sortedWarnings.map((warning) => (
        <WarningBanner
          key={warning.code}
          warning={warning}
          isAcknowledged={acknowledgedWarnings.includes(warning.code)}
          onAcknowledge={() => onAcknowledge(warning.code)}
        />
      ))}
    </div>
  );
};
