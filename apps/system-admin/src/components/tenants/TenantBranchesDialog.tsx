"use client";

import { useState } from "react";
import { Button, Shad, Icon, Empty } from "@repo/ui";
import { useTenantBranches } from "@/hooks/branch";
import type { Branch } from "@/dto/branch.dto";
import { BranchFormDialog } from "./BranchFormDialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
};

function BranchRow({
  branch,
  onEdit,
}: {
  branch: Branch;
  onEdit: (branch: Branch) => void;
}) {
  return (
    <Shad.TableRow>
      <Shad.TableCell className="font-medium">{branch.name}</Shad.TableCell>
      <Shad.TableCell>{branch.address || "—"}</Shad.TableCell>
      <Shad.TableCell>{branch.phone || "—"}</Shad.TableCell>
      <Shad.TableCell className="text-right">
        <Button variant="outline" size="sm" onClick={() => onEdit(branch)}>
          Edit
        </Button>
      </Shad.TableCell>
    </Shad.TableRow>
  );
}

export function TenantBranchesDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
}: Props) {
  const { data: branches = [], isLoading, refetch } =
    useTenantBranches(tenantId);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const handleAdd = () => {
    setSelectedBranch(null);
    setFormOpen(true);
  };

  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setFormOpen(true);
  };

  return (
    <>
      <Shad.Dialog open={open} onOpenChange={onOpenChange}>
        <Shad.DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <Shad.DialogHeader>
            <Shad.DialogTitle>Branches in {tenantName}</Shad.DialogTitle>
            <Shad.DialogDescription>
              Manage branches for this tenant organization
            </Shad.DialogDescription>
          </Shad.DialogHeader>

          <div className="flex items-center justify-between py-2">
            <p className="text-sm text-muted-foreground">
              {branches.length} branch{branches.length !== 1 ? "es" : ""}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                iconName="RefreshCw"
              >
                Refresh
              </Button>
              <Button size="sm" onClick={handleAdd} iconName="Plus">
                Add Branch
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Icon name="LoaderCircle" className="animate-spin" size={24} />
                <span className="ml-2 text-muted-foreground">
                  Loading branches...
                </span>
              </div>
            ) : branches.length === 0 ? (
              <Empty
                title="No branches yet"
                description="Add the first branch for this tenant."
                icon="Building2"
              />
            ) : (
              <Shad.Table>
                <Shad.TableHeader>
                  <Shad.TableRow>
                    <Shad.TableHead>Name</Shad.TableHead>
                    <Shad.TableHead>Address</Shad.TableHead>
                    <Shad.TableHead>Phone</Shad.TableHead>
                    <Shad.TableHead className="text-right">
                      Actions
                    </Shad.TableHead>
                  </Shad.TableRow>
                </Shad.TableHeader>
                <Shad.TableBody>
                  {branches.map((branch) => (
                    <BranchRow
                      key={branch.id}
                      branch={branch}
                      onEdit={handleEdit}
                    />
                  ))}
                </Shad.TableBody>
              </Shad.Table>
            )}
          </div>

          <Shad.DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </Shad.DialogFooter>
        </Shad.DialogContent>
      </Shad.Dialog>

      <BranchFormDialog
        open={formOpen}
        onOpenChange={(nextOpen) => {
          setFormOpen(nextOpen);
          if (!nextOpen) setSelectedBranch(null);
        }}
        tenantId={tenantId}
        branch={selectedBranch}
      />
    </>
  );
}
