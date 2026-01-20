import { Button, Icon, Shad, cn } from "@repo/ui";
import { Modifier, ModifierGroupItem } from "@/types/modifiers";
import { useDeleteModifier } from "@/hooks/useModifierApi";

/**
 * ========================================
 * MODIFIER GROUP CARD
 * ========================================
 * Displays a modifier group with its modifiers
 * Supports grid and list view modes
 */

interface ModifierGroupCardProps {
  group: ModifierGroupItem;
  viewMode: "grid" | "list";
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddModifier: () => void;
  onEditModifier: (modifier: {
    id: string;
    name: string;
    price: number;
    productId?: string | null;
  }) => void;
}

export const ModifierGroupCard = ({
  group,
  viewMode,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddModifier,
  onEditModifier,
}: ModifierGroupCardProps) => {
  const deleteModifier = useDeleteModifier();

  const handleDeleteModifier = (modifier: Modifier) => {
    if (
      !window.confirm(`Are you sure you want to delete "${modifier.name}"?`)
    ) {
      return;
    }
    deleteModifier.mutate({
      groupId: group.id,
      modifierId: modifier.id,
    });
  };

  const modifierCount = group.modifiers?.length || 0;
  const isSingle = group.type === "SINGLE";

  if (viewMode === "list") {
    return (
      <div className="bg-card border rounded-lg overflow-hidden">
        {/* Header */}
        <div
          onClick={onToggleExpand}
          className={cn(
            "flex items-center justify-between p-4 cursor-pointer",
            "hover:bg-accent/50 transition-colors",
          )}
        >
          <div className="flex items-center gap-3">
            <Icon
              name={isExpanded ? "ChevronDown" : "ChevronRight"}
              className="h-4 w-4 text-muted-foreground"
            />
            <div>
              <h3 className="font-semibold">{group.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "px-2 py-0.5 text-xs rounded-full font-medium",
                    isSingle
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                  )}
                >
                  {isSingle ? "Single Choice" : "Multiple Choice"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {modifierCount} modifier{modifierCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" onClick={onAddModifier}>
              <Icon name="Plus" className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Icon name="Pencil" className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Icon name="Trash2" className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Modifiers List */}
        {isExpanded && (
          <div className="border-t bg-muted/30">
            {modifierCount === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No modifiers yet.{" "}
                <button
                  onClick={onAddModifier}
                  className="text-primary hover:underline"
                >
                  Add one
                </button>
              </div>
            ) : (
              <div className="divide-y">
                {group.modifiers.map((modifier) => (
                  <ModifierRow
                    key={modifier.id}
                    modifier={modifier}
                    onEdit={() => onEditModifier(modifier)}
                    onDelete={() => handleDeleteModifier(modifier)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Grid View
  return (
    <Shad.Card className="overflow-hidden">
      <Shad.CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <Shad.CardTitle className="text-lg">{group.name}</Shad.CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn(
                  "px-2 py-0.5 text-xs rounded-full font-medium",
                  isSingle
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                )}
              >
                {isSingle ? "Single" : "Multiple"}
              </span>
            </div>
          </div>
          <Shad.DropdownMenu>
            <Shad.DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Icon name="ChevronsUpDown" className="h-4 w-4" />
              </Button>
            </Shad.DropdownMenuTrigger>
            <Shad.DropdownMenuContent align="end">
              <Shad.DropdownMenuItem onClick={onAddModifier}>
                <Icon name="Plus" className="h-4 w-4 mr-2" />
                Add Modifier
              </Shad.DropdownMenuItem>
              <Shad.DropdownMenuItem onClick={onEdit}>
                <Icon name="Pencil" className="h-4 w-4 mr-2" />
                Edit Group
              </Shad.DropdownMenuItem>
              <Shad.DropdownMenuSeparator />
              <Shad.DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Icon name="Trash2" className="h-4 w-4 mr-2" />
                Delete Group
              </Shad.DropdownMenuItem>
            </Shad.DropdownMenuContent>
          </Shad.DropdownMenu>
        </div>
      </Shad.CardHeader>

      <Shad.CardContent className="pt-0">
        <Shad.CardDescription className="text-xs mb-3">
          {isSingle
            ? "Customer selects exactly one option (required)"
            : "Customer can select multiple options (optional)"}
        </Shad.CardDescription>

        {/* Modifiers */}
        <div className="space-y-2">
          {modifierCount === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
              No modifiers yet
            </div>
          ) : (
            <>
              {group.modifiers.slice(0, 3).map((modifier) => (
                <div
                  key={modifier.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md",
                    "bg-muted/50 group hover:bg-muted",
                  )}
                >
                  <span className="text-sm font-medium truncate">
                    {modifier.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {modifier.price > 0
                        ? `+$${Number(modifier.price).toFixed(2)}`
                        : "Free"}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onEditModifier(modifier)}
                      >
                        <Icon name="Pencil" className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteModifier(modifier)}
                      >
                        <Icon name="Trash2" className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {modifierCount > 3 && (
                <button
                  onClick={onToggleExpand}
                  className="w-full text-center py-2 text-xs text-primary hover:underline"
                >
                  +{modifierCount - 3} more modifier
                  {modifierCount - 3 !== 1 ? "s" : ""}
                </button>
              )}
            </>
          )}
        </div>

        {/* Add Modifier Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3"
          onClick={onAddModifier}
        >
          <Icon name="Plus" className="h-4 w-4 mr-2" />
          Add Modifier
        </Button>
      </Shad.CardContent>
    </Shad.Card>
  );
};

/**
 * ========================================
 * MODIFIER ROW (List View)
 * ========================================
 */

interface ModifierRowProps {
  modifier: Modifier;
  onEdit: () => void;
  onDelete: () => void;
}

const ModifierRow = ({ modifier, onEdit, onDelete }: ModifierRowProps) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 group hover:bg-accent/50">
      <div className="flex items-center gap-3 pl-7">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            modifier.price > 0 ? "bg-green-500" : "bg-muted-foreground/30",
          )}
        />
        <span className="text-sm font-medium">{modifier.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "text-sm",
            modifier.price > 0
              ? "text-green-600 dark:text-green-400"
              : "text-muted-foreground",
          )}
        >
          {modifier.price > 0
            ? `+$${Number(modifier.price).toFixed(2)}`
            : "Free"}
        </span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
          >
            <Icon name="Pencil" className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Icon name="Trash2" className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
