import { Button, Icon, Textarea } from "@repo/ui";
import { useCallback, useState } from "react";

const NOTE_CHIPS = [
  "Wait",
  "Rush",
  "To Serve",
  "Allergies",
  "No Spice",
  "Extra Sauce",
] as const;

type Props = {
  initialNote: string;
  onSave: (note: string) => void;
};

/** Quick note editor for a cart item — chips for common kitchen notes plus free text. */
export const ItemNoteForm = ({ initialNote, onSave }: Props) => {
  const [note, setNote] = useState(initialNote);

  const handleChip = useCallback((chip: string) => {
    setNote((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}, ${chip}` : chip;
    });
  }, []);

  return (
    <div className="px-2 mx-auto flex flex-col gap-3">
      {/* Quick Chips */}
      <div className="flex flex-wrap gap-1.5">
        {NOTE_CHIPS.map((chip) => (
          <Button
            key={chip}
            size="sm"
            variant="outline"
            className="text-xs h-8"
            onClick={() => handleChip(chip)}
          >
            {chip}
          </Button>
        ))}
      </div>

      {/* Free-text */}
      <Textarea
        placeholder="Add a note for this item..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="h-24 resize-none text-sm"
        autoFocus
      />

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            setNote("");
            onSave("");
          }}
        >
          Clear
        </Button>
        <Button className="flex-1" onClick={() => onSave(note)}>
          <Icon name="Check" className="w-4 h-4 mr-1" />
          Save Note
        </Button>
      </div>
    </div>
  );
};
