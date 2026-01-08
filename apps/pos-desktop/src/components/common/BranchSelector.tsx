import { useBranchesByTenant } from "@/hooks/useBranch";
import { useAuthStore } from "@/store/authStore";
import { useBranchStore } from "@/store/branchStore";
import { SButton, Icon, Shad } from "@repo/ui";
import { useEffect } from "react";

export const BranchSelector = () => {
  const { user } = useAuthStore();
  const { branchId, setBranchId } = useBranchStore();
  const { data: branches = [], isLoading } = useBranchesByTenant(
    user?.tenantId
  );

  // Auto-select first branch if none selected and branches are available
  useEffect(() => {
    if (!branchId && branches.length > 0 && branches[0]) {
      setBranchId(branches[0].id);
    }
  }, [branches, branchId, setBranchId]);

  const selectedBranch = branches.find((b) => b.id === branchId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon name="Building2" className="h-4 w-4" />
        <span>Loading branches...</span>
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon name="Building2" className="h-4 w-4" />
        <span>No branches</span>
      </div>
    );
  }

  // If only one branch, just display it
  if (branches.length === 1 && branches[0]) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Icon name="Building2" className="h-4 w-4" />
        <span className="font-medium">{branches[0].name}</span>
      </div>
    );
  }

  if (user?.role === "CASHIER") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Icon name="Building2" className="h-4 w-4" />
        <span className="font-medium">
          {selectedBranch?.name || "Select Branch"}
        </span>
      </div>
    );
  }

  return (
    <Shad.DropdownMenu>
      <Shad.DropdownMenuTrigger asChild>
        <SButton size="sm" variant="outline">
          <Icon name="Building2" className="h-4 w-4 mr-2" />
          <span className="font-medium">
            {selectedBranch?.name || "Select Branch"}
          </span>
          <Icon name="ChevronDown" className="h-4 w-4" />
        </SButton>
      </Shad.DropdownMenuTrigger>

      <Shad.DropdownMenuContent align="center" className="w-56">
        <Shad.DropdownMenuLabel>Select Branch</Shad.DropdownMenuLabel>
        <Shad.DropdownMenuSeparator />
        {branches.map((branch) => (
          <Shad.DropdownMenuItem
            key={branch.id}
            onClick={() => setBranchId(branch.id)}
            className={branchId === branch.id ? "bg-accent text-white" : ""}
          >
            <div className="flex items-center justify-between w-full">
              <div>
                <div className="font-medium">{branch.name}</div>
                {branch.address && (
                  <div className="text-xs text-muted-foreground">
                    {branch.address}
                  </div>
                )}
              </div>
              {branchId === branch.id && (
                <Icon name="Check" className="h-4 w-4" />
              )}
            </div>
          </Shad.DropdownMenuItem>
        ))}
      </Shad.DropdownMenuContent>
    </Shad.DropdownMenu>
  );
};
