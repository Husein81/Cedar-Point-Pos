import { useState } from "react";
import { Button, Icon, Shad } from "@repo/ui";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useDeleteSubcategory } from "@/hooks/useSubcategory";
import { SubcategoryForm } from "./SubcategoryForm";
import type { Category, Subcategory } from "@/shared/models";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
};

export const SubcategoriesDialog = ({ open, onOpenChange, category }: Props) => {
  const deleteSubcategory = useDeleteSubcategory();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subcategory | null>(null);
  const [deleting, setDeleting] = useState<Subcategory | null>(null);

  if (!category) return null;

  return (
    <>
      <Shad.Dialog open={open} onOpenChange={onOpenChange}>
        <Shad.DialogContent className="max-w-md">
          <Shad.DialogHeader>
            <Shad.DialogTitle>
              Subcategories · {category.name}
            </Shad.DialogTitle>
            <Shad.DialogDescription>
              Break this category down further (e.g. Drinks → Soft Drinks,
              Juices).
            </Shad.DialogDescription>
          </Shad.DialogHeader>

          <div className="space-y-2">
            {category.subcategories.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No subcategories yet
              </p>
            ) : (
              <div className="rounded-md border divide-y">
                {category.subcategories.map((subcategory) => (
                  <div
                    key={subcategory.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-sm font-medium">
                      {subcategory.name}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        iconName="Pencil"
                        onClick={() => {
                          setEditing(subcategory);
                          setIsFormOpen(true);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        iconName="Trash2"
                        onClick={() => setDeleting(subcategory)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Shad.DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setIsFormOpen(true);
              }}
            >
              <Icon name="Plus" className="w-4 h-4" />
              Add Subcategory
            </Button>
          </Shad.DialogFooter>
        </Shad.DialogContent>
      </Shad.Dialog>

      <SubcategoryForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        categoryId={category.id}
        subcategory={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(isOpen) => !isOpen && setDeleting(null)}
        title="Delete subcategory?"
        description={`"${deleting?.name}" will be removed. Products must be moved out of it first.`}
        isPending={deleteSubcategory.isPending}
        onConfirm={async () => {
          if (deleting) await deleteSubcategory.mutateAsync(deleting.id);
        }}
      />
    </>
  );
};
