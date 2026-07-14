import { Button, Icon, Shad, cn } from "@repo/ui";
import { TableShape } from "@repo/types";
import { TABLE_SHAPE_CONFIG } from "./config";
import type { FloorEditorApi } from "./hooks";

interface FloorEditorToolbarProps {
  editor: FloorEditorApi;
}

/**
 * Floating toolbar shown while the Floor Editor is active (manager mode):
 * snap/grid toggles, undo/redo, and rotate/resize/shape controls for the
 * selected table, plus Save / Discard.
 */
export function FloorEditorToolbar({ editor }: FloorEditorToolbarProps) {
  const hasSelection = editor.editorSelectedId !== null;

  return (
    <div className="bg-card/95 absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border p-1.5 shadow-lg backdrop-blur">
      <Shad.TooltipProvider delayDuration={300}>
        <ToolbarToggle
          icon="Magnet"
          label="Snap to grid"
          active={editor.snapEnabled}
          onClick={editor.toggleSnap}
        />
        <ToolbarToggle
          icon="Grid3x3"
          label="Show grid"
          active={editor.showGrid}
          onClick={editor.toggleGrid}
        />

        <Separator />

        <ToolbarButton
          icon="Undo2"
          label="Undo"
          disabled={!editor.canUndo}
          onClick={editor.undo}
        />
        <ToolbarButton
          icon="Redo2"
          label="Redo"
          disabled={!editor.canRedo}
          onClick={editor.redo}
        />

        <Separator />

        <ToolbarButton
          icon="RotateCw"
          label="Rotate 45°"
          disabled={!hasSelection}
          onClick={editor.rotateSelected}
        />
        <ToolbarButton
          icon="Expand"
          label="Larger"
          disabled={!hasSelection}
          onClick={() => editor.resizeSelected(1)}
        />
        <ToolbarButton
          icon="Shrink"
          label="Smaller"
          disabled={!hasSelection}
          onClick={() => editor.resizeSelected(-1)}
        />

        {/* Shape picker for the selected table */}
        <Shad.DropdownMenu>
          <Shad.Tooltip>
            <Shad.TooltipTrigger asChild>
              <Shad.DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  iconName="Shapes"
                  aria-label="Change shape"
                  disabled={!hasSelection}
                />
              </Shad.DropdownMenuTrigger>
            </Shad.TooltipTrigger>
            <Shad.TooltipContent>Change shape</Shad.TooltipContent>
          </Shad.Tooltip>
          <Shad.DropdownMenuContent align="center">
            {Object.values(TableShape).map((shape) => (
              <Shad.DropdownMenuItem
                key={shape}
                onSelect={() => editor.setShapeSelected(shape)}
              >
                <Icon
                  name={TABLE_SHAPE_CONFIG[shape].icon}
                  className="h-4 w-4"
                />
                {TABLE_SHAPE_CONFIG[shape].label}
              </Shad.DropdownMenuItem>
            ))}
          </Shad.DropdownMenuContent>
        </Shad.DropdownMenu>

        <Separator />

        <Button
          variant="ghost"
          size="sm"
          onClick={editor.discard}
          disabled={editor.isSaving}
        >
          Discard
        </Button>
        <Button
          size="sm"
          iconName="Save"
          onClick={editor.save}
          disabled={!editor.isDirty || editor.isSaving}
          isSubmitting={editor.isSaving}
        >
          Save Layout
        </Button>
      </Shad.TooltipProvider>
    </div>
  );
}

function Separator() {
  return <div className="bg-border mx-1 h-6 w-px" />;
}

function ToolbarButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Shad.Tooltip>
      <Shad.TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          iconName={icon}
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        />
      </Shad.TooltipTrigger>
      <Shad.TooltipContent>{label}</Shad.TooltipContent>
    </Shad.Tooltip>
  );
}

function ToolbarToggle({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Shad.Tooltip>
      <Shad.TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          iconName={icon}
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(active && "bg-accent text-accent-foreground")}
        />
      </Shad.TooltipTrigger>
      <Shad.TooltipContent>{label}</Shad.TooltipContent>
    </Shad.Tooltip>
  );
}
