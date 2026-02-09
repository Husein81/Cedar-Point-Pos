import { useModalStore } from "@/store/modalStore";
import { ModifierGroupItem } from "@/types/modifiers";
import { Icon, Shad } from "@repo/ui";
import { useDeleteModifierGroup } from "@/hooks/useModifierGroupApi";
import { ModifierGroupForm } from "./ModifierGroupForm";
import { ModifierForm } from "./ModifierForm";

export const ModifierGroupActions = ({
  group,
}: {
  group: ModifierGroupItem;
}) => {
  const openModal = useModalStore((state) => state.openModal);
  const deleteMutation = useDeleteModifierGroup();

  const handleEdit = () => {
    openModal("Edit Modifier Group", <ModifierGroupForm editingGroup={group} />);
  };

  const handleAddModifier = () => {
    openModal("Add Modifier", <ModifierForm groupId={group.id} />);
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${group.name}"? This will also delete all modifiers in this group.`
      )
    ) {
      try {
        await deleteMutation.mutateAsync(group.id);
      } catch (error) {
        console.error("Failed to delete modifier group:", error);
      }
    }
  };

  return (
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
          <Icon name="SquarePen" className="h-4 w-4 hover:text-accent" />
          Edit Group
        </Shad.DropdownMenuItem>
        <Shad.DropdownMenuItem onClick={handleDelete} variant="destructive">
          <Icon name="Trash2" className="h-4 w-4" />
          Delete Group
        </Shad.DropdownMenuItem>
      </Shad.DropdownMenuContent>
    </Shad.DropdownMenu>
  );
};
