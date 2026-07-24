import React, { useState } from "react";
import { Button, Icon, Shad, cn } from "@repo/ui";
import { Modifier, ModifierGroupItem } from "@/types/modifiers";
import { useDeleteModifier } from "@/hooks/useModifierApi";
import { useDeleteModifierGroup } from "@/hooks/useModifierGroupApi";
import { useBaseCurrency } from "@/hooks/useCurrency";
import { useModalStore } from "@/store/modalStore";
import { ModifierGroupForm } from "./ModifierGroupForm";
import { ModifierForm } from "./ModifierForm";

interface ModifierGroupCardProps {
  group: ModifierGroupItem;
  viewMode?: "grid" | "list";
  forceExpanded?: boolean;
}

export const ModifierGroupCard = ({
  group,
  viewMode = "grid",
  forceExpanded = true,
}: ModifierGroupCardProps) => {
  const { openModal } = useModalStore();
  const { format: formatMoney } = useBaseCurrency();
  const [isExpanded, setIsExpanded] = useState(forceExpanded);
  const deleteGroup = useDeleteModifierGroup();
  const deleteModifier = useDeleteModifier();

  // Sync with forceExpanded prop when it changes
  React.useEffect(() => {
    setIsExpanded(forceExpanded);
  }, [forceExpanded]);

  const modifierCount = group.modifiers?.length || 0;
  const isSingle = group.type === "SINGLE";

  const handleEdit = () => {
    openModal(
      "Edit Modifier Group",
      <ModifierGroupForm editingGroup={group} />,
    );
  };

  const handleAddModifier = () => {
    openModal("Add Modifier", <ModifierForm groupId={group.id} />);
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${group.name}"? This will also delete all modifiers in this group.`,
      )
    ) {
      deleteGroup.mutate(group.id);
    }
  };

  const handleEditModifier = (modifier: Modifier) => {
    openModal(
      "Edit Modifier",
      <ModifierForm groupId={group.id} editingModifier={modifier} />,
    );
  };

  const handleDeleteModifier = (modifier: Modifier) => {
    if (
      window.confirm(`Are you sure you want to delete "${modifier.name}?"?`)
    ) {
      deleteModifier.mutate({
        groupId: group.id,
        modifierId: modifier.id,
      });
    }
  };

  // List View
  if (viewMode === "list") {
    return (
      <Shad.Card className="p-4 hover:shadow-md transition-shadow">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-semibold truncate">{group.name}</h3>
                <span
                  className={cn(
                    "px-2.5 py-0.5 text-xs rounded-full font-medium whitespace-nowrap",
                    isSingle
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                  )}
                >
                  {isSingle ? "Single Choice" : "Multiple Choice"}
                </span>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {modifierCount} modifier{modifierCount !== 1 ? "s" : ""}
                </span>
                {modifierCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    <Icon
                      name={isExpanded ? "ChevronUp" : "ChevronDown"}
                      className="h-4 w-4"
                    />
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isSingle
                  ? "Customer selects exactly one option"
                  : "Customer can select multiple options"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleAddModifier}>
                <Icon name="Plus" className="h-4 w-4 mr-2" />
                Add Modifier
              </Button>
              <Shad.DropdownMenu>
                <Shad.DropdownMenuTrigger>
                  <Icon name="Ellipsis" className="size-4" />
                </Shad.DropdownMenuTrigger>
                <Shad.DropdownMenuContent align="end">
                  <Shad.DropdownMenuItem onClick={handleAddModifier}>
                    <Icon name="Plus" className="h-4 w-4 hover:text-accent" />
                    Add Modifier
                  </Shad.DropdownMenuItem>
                  <Shad.DropdownMenuItem onClick={handleEdit}>
                    <Icon
                      name="SquarePen"
                      className="h-4 w-4 hover:text-accent"
                    />
                    Edit Group
                  </Shad.DropdownMenuItem>
                  <Shad.DropdownMenuItem
                    onClick={handleDelete}
                    variant="destructive"
                  >
                    <Icon name="Trash2" className="h-4 w-4" />
                    Delete Group
                  </Shad.DropdownMenuItem>
                </Shad.DropdownMenuContent>
              </Shad.DropdownMenu>
            </div>
          </div>

          {/* Expanded Modifiers in List View */}
          {isExpanded && modifierCount > 0 && (
            <div className="space-y-2 pt-2 border-t">
              {group.modifiers.map((modifier) => (
                <div
                  key={modifier.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {modifier.name}
                      </span>
                      {modifier.productAssignments &&
                      modifier.productAssignments.length > 0 ? (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                          {modifier.productAssignments.length === 1
                            ? modifier.productAssignments[0]?.product?.name
                            : `${modifier.productAssignments.length} products`}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                          All products
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {modifier.price > 0
                        ? `+${formatMoney(modifier.price)}`
                        : "Free"}
                    </span>
                    <Shad.DropdownMenu>
                      <Shad.DropdownMenuTrigger>
                        <Icon name="Ellipsis" className="size-3" />
                      </Shad.DropdownMenuTrigger>
                      <Shad.DropdownMenuContent align="end">
                        <Shad.DropdownMenuItem
                          onClick={() => handleEditModifier(modifier)}
                        >
                          <Icon
                            name="SquarePen"
                            className="h-4 w-4 hover:text-accent"
                          />
                          Edit
                        </Shad.DropdownMenuItem>
                        <Shad.DropdownMenuItem
                          onClick={() => handleDeleteModifier(modifier)}
                          variant="destructive"
                        >
                          <Icon name="Trash2" className="h-4 w-4" />
                          Delete
                        </Shad.DropdownMenuItem>
                      </Shad.DropdownMenuContent>
                    </Shad.DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Shad.Card>
    );
  }

  // Grid View
  return (
    <Shad.Card className="overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
      <Shad.CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <Shad.CardTitle className="text-lg mb-2">
              {group.name}
            </Shad.CardTitle>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "px-2.5 py-0.5 text-xs rounded-full font-medium",
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
          <div className="flex items-center gap-1">
            {modifierCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <Icon
                  name={isExpanded ? "ChevronUp" : "ChevronDown"}
                  className="h-4 w-4"
                />
              </Button>
            )}
            <Shad.DropdownMenu>
              <Shad.DropdownMenuTrigger asChild>
                <button
                  aria-label="ellipsis"
                  className="h-7 w-7 flex items-center justify-center hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                >
                  <Icon name="Ellipsis" className="h-4 w-4" />
                </button>
              </Shad.DropdownMenuTrigger>
              <Shad.DropdownMenuContent align="end">
                <Shad.DropdownMenuItem onClick={handleAddModifier}>
                  <Icon name="Plus" className="h-4 w-4 hover:text-accent" />
                  Add Modifier
                </Shad.DropdownMenuItem>
                <Shad.DropdownMenuItem onClick={handleEdit}>
                  <Icon
                    name="SquarePen"
                    className="h-4 w-4 hover:text-accent"
                  />
                  Edit Group
                </Shad.DropdownMenuItem>
                <Shad.DropdownMenuItem
                  onClick={handleDelete}
                  variant="destructive"
                >
                  <Icon name="Trash2" className="h-4 w-4" />
                  Delete Group
                </Shad.DropdownMenuItem>
              </Shad.DropdownMenuContent>
            </Shad.DropdownMenu>
          </div>
        </div>
      </Shad.CardHeader>

      <Shad.CardContent className="pt-0 flex-1">
        <Shad.CardDescription className="text-xs mb-3">
          {isSingle
            ? "Customer selects exactly one option"
            : "Customer can select multiple options"}
        </Shad.CardDescription>

        {/* Modifiers Preview */}
        {modifierCount === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
            No modifiers yet
          </div>
        ) : isExpanded ? (
          <div className="space-y-2">
            {group.modifiers.map((modifier) => (
              <div
                key={modifier.id}
                className="flex items-center justify-between p-2.5 rounded-md bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {modifier.name}
                    </span>
                    {modifier.productAssignments &&
                    modifier.productAssignments.length > 0 ? (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                        {modifier.productAssignments.length === 1
                          ? modifier.productAssignments[0]?.product.name
                          : `${modifier.productAssignments.length} products`}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                        All products
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {modifier.price > 0
                      ? `+${formatMoney(modifier.price)}`
                      : "Free"}
                  </span>
                  <Shad.DropdownMenu>
                    <Shad.DropdownMenuTrigger>
                      <Icon name="Ellipsis" className="size-3" />
                    </Shad.DropdownMenuTrigger>
                    <Shad.DropdownMenuContent align="end">
                      <Shad.DropdownMenuItem
                        onClick={() => handleEditModifier(modifier)}
                      >
                        <Icon
                          name="SquarePen"
                          className="h-4 w-4 hover:text-accent"
                        />
                        Edit
                      </Shad.DropdownMenuItem>
                      <Shad.DropdownMenuItem
                        onClick={() => handleDeleteModifier(modifier)}
                        variant="destructive"
                      >
                        <Icon name="Trash2" className="h-4 w-4" />
                        Delete
                      </Shad.DropdownMenuItem>
                    </Shad.DropdownMenuContent>
                  </Shad.DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Shad.CardContent>

      <Shad.CardFooter className="pt-3 mt-auto">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleAddModifier}
        >
          <Icon name="Plus" className="h-4 w-4 mr-2" />
          Add Modifier
        </Button>
      </Shad.CardFooter>
    </Shad.Card>
  );
};
