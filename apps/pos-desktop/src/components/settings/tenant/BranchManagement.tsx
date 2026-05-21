import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { branchApi } from "@/apis/branchApi";
import { Shad, Button, Icon } from "@repo/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { BranchForm } from "./BranchForm";
import type { Branch } from "@repo/types";
import { toast } from "@repo/ui";

export function BranchManagement() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | undefined>();

  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchApi.getBranches(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => branchApi.deleteBranch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete branch");
    },
  });

  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedBranch(undefined);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this branch?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["branches"] });
  };

  return (
    <Shad.Card>
      <Shad.CardHeader className="flex flex-row items-center justify-between">
        <div>
          <Shad.CardTitle>Branches</Shad.CardTitle>
          <Shad.CardDescription>
            Manage your business locations
          </Shad.CardDescription>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Branch
        </Button>
      </Shad.CardHeader>
      <Shad.CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Icon
              name="Loader2"
              className="h-6 w-6 animate-spin text-muted-foreground"
            />
          </div>
        ) : branches && branches.length > 0 ? (
          <div className="space-y-4">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h4 className="font-medium">{branch.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {branch.address || "No address"} •{" "}
                    {branch.phone || "No phone"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(branch)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(branch.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No branches found. Add your first location above.
          </div>
        )}

        <Shad.Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Shad.DialogContent>
            <Shad.DialogHeader>
              <Shad.DialogTitle>
                {selectedBranch ? "Edit Branch" : "Add New Branch"}
              </Shad.DialogTitle>
              <Shad.DialogDescription>
                {selectedBranch
                  ? "Update the details for this location."
                  : "Enter the details for your new business location."}
              </Shad.DialogDescription>
            </Shad.DialogHeader>
            <BranchForm
              branch={selectedBranch}
              onSuccess={handleSuccess}
              onCancel={() => setIsDialogOpen(false)}
            />
          </Shad.DialogContent>
        </Shad.Dialog>
      </Shad.CardContent>
    </Shad.Card>
  );
}
