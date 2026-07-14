import { useState } from "react";
import { Button, Input } from "@repo/ui";

interface SeatGuestsModalProps {
  tableName: string;
  onConfirm: (guestCount?: number) => void;
  onCancel: () => void;
}

export function SeatGuestsModal({
  tableName,
  onConfirm,
  onCancel,
}: SeatGuestsModalProps) {
  const [guestCount, setGuestCount] = useState<string>("");

  const handleConfirm = () => {
    const count =
      guestCount.trim() === "" ? undefined : parseInt(guestCount, 10);
    if (count !== undefined && (isNaN(count) || count < 1)) {
      return;
    }
    onConfirm(count);
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Enter the number of guests for{" "}
        <strong>{tableName}</strong>.
      </p>
      <div>
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Number of guests (optional)"
          value={guestCount}
          onChange={(e) => setGuestCount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
          }}
          min="1"
          autoFocus
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleConfirm}>
          Seat Guests
        </Button>
      </div>
    </div>
  );
}
