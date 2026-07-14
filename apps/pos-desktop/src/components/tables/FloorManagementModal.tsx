import { useState } from "react";
import { Button, Icon, Skeleton } from "@repo/ui";
import { useFloorsByBranch, useDeleteFloor } from "@/hooks/useFloor";
import { useModalStore } from "@/store/modalStore";
import { FloorForm } from "./FloorForm";
import AlertDialog from "../common/AlertDialog";
import type { FloorWithTableCount } from "@/dto/tables.dto";

type View = "list" | "create" | "edit";

export function FloorManagementModal() {
  const { closeModal } = useModalStore();
  const { data: floors = [], isLoading } = useFloorsByBranch();
  const deleteFloorMutation = useDeleteFloor();

  const [view, setView] = useState<View>("list");
  const [editingFloor, setEditingFloor] = useState<FloorWithTableCount | null>(
    null,
  );

  const handleBack = () => {
    setView("list");
    setEditingFloor(null);
  };

  const handleAddClick = () => {
    setView("create");
    setEditingFloor(null);
  };

  const handleEditClick = (floor: FloorWithTableCount) => {
    setEditingFloor(floor);
    setView("edit");
  };

  const handleDeleteFloor = (floorId: string) => {
    deleteFloorMutation.mutate(floorId, {
      onSuccess: () => {
        handleBack();
      },
    });
  };

  const handleDeleteFloorWithConfirm = (floor: FloorWithTableCount) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${floor.name}"? This action cannot be undone. All tables associated with this floor will be unassigned.`,
      )
    ) {
      handleDeleteFloor(floor.id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex justify-between items-center pb-2 border-b">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 p-4 min-h-[400px]">
      {view === "list" ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Manage your restaurant floor layout plans and sections
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleAddClick}
              className="h-10 px-4 flex items-center gap-2"
            >
              <Icon name="Plus" className="size-4" />
              Add New Floor
            </Button>
          </div>

          {/* Floors List */}
          {floors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
              <div className="bg-muted p-3 rounded-full mb-3 text-muted-foreground">
                <Icon name="Layers" className="size-6" />
              </div>
              <h3 className="font-semibold text-lg">No Floors Created Yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mt-1">
                Floors represent different physical spaces of your branch like
                Ground Floor, Terrace, or VIP rooms.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border border rounded-lg overflow-hidden bg-card">
              {floors.map((floor) => (
                <div
                  key={floor.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary p-2.5 rounded-lg flex items-center justify-center">
                      <Icon name="Layers" className="size-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-base text-foreground">
                        {floor.name}
                      </h4>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Icon name="Square" className="size-3" />
                          {floor._count?.tables || 0} tables
                        </span>
                        <span className="h-1 w-1 bg-muted-foreground/30 rounded-full" />
                        <span>Display Order: {floor.order ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Spacious and touch-friendly) */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(floor)}
                      className="h-10 px-3.5 flex items-center gap-1.5 font-medium text-sm transition-all"
                    >
                      <Icon name="Pencil" className="size-4" />
                      Edit
                    </Button>

                    <AlertDialog
                      label="Delete"
                      iconButton="Trash2"
                      variant="delete"
                      buttonVariant="destructive"
                      className="h-10 px-3.5 flex-1"
                      title={`Delete "${floor.name}"?`}
                      description="This action cannot be undone. All tables associated with this floor will be unassigned."
                      confirmText="Delete Floor"
                      onConfirm={() => handleDeleteFloor(floor.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-4 mt-auto">
            <Button
              variant="outline"
              onClick={closeModal}
              className="h-10 px-6"
            >
              Close
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center gap-3 border-b pb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-10 w-10 rounded-full hover:bg-muted"
            >
              <Icon name="ArrowLeft" className="size-5" />
            </Button>
            <div>
              <h3 className="font-semibold text-lg">
                {view === "create"
                  ? "Add New Floor"
                  : `Edit Floor: ${editingFloor?.name}`}
              </h3>
              <p className="text-xs text-muted-foreground">
                {view === "create"
                  ? "Define a new restaurant floor or space layout"
                  : "Update the floor properties and details"}
              </p>
            </div>
          </div>

          {/* Embedded Form */}
          <div className="py-2">
            <FloorForm
              floor={editingFloor || undefined}
              onSuccess={handleBack}
              onCancel={handleBack}
              onDelete={
                editingFloor
                  ? () => handleDeleteFloorWithConfirm(editingFloor)
                  : undefined
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
