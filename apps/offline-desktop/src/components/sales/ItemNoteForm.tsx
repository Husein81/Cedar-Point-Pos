import { Button, Icon, Textarea } from "@repo/ui";
import { useCallback, useState } from "react";

const NOTE_CHIPS = ["Rush", "Gift wrap", "Fragile", "Allergy", "No receipt"] as const;

type Props = {
  initialNote: string;
  onSave: (note: string) => void;
};

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

      <Textarea
        placeholder="Add a note for this item..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="h-24 resize-none text-sm"
        autoFocus
      />

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
