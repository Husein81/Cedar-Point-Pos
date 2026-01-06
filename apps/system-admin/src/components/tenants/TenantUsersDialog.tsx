"use client";

import { Button, Shad, Icon, Empty } from "@repo/ui";
import { useTenantUsers } from "@/hooks/tenant";
import type { TenantUser } from "@/types/tenant";
import type { BusinessType } from "@repo/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  businessType: BusinessType;
  onCreateUser: () => void;
};

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "ADMIN":
      return "bg-purple-100 text-purple-800";
    case "MANAGER":
      return "bg-blue-100 text-blue-800";
    case "CASHIER":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function UserRow({ user }: { user: TenantUser }) {
  return (
    <Shad.TableRow>
      <Shad.TableCell>
        <div className="flex items-center gap-3">
          <Shad.Avatar className="h-8 w-8">
            <Shad.AvatarFallback className="text-xs">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </Shad.AvatarFallback>
          </Shad.Avatar>
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          </div>
        </div>
      </Shad.TableCell>
      <Shad.TableCell>{user.email || "—"}</Shad.TableCell>
      <Shad.TableCell>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}
        >
          {user.role}
        </span>
      </Shad.TableCell>
      <Shad.TableCell>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            user.isActive
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {user.isActive ? "Active" : "Inactive"}
        </span>
      </Shad.TableCell>
      <Shad.TableCell className="text-muted-foreground">
        {formatDate(user.createdAt)}
      </Shad.TableCell>
    </Shad.TableRow>
  );
}

export function TenantUsersDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  onCreateUser,
}: Props) {
  const { data: users = [], isLoading, refetch } = useTenantUsers(tenantId);

  return (
    <Shad.Dialog open={open} onOpenChange={onOpenChange}>
      <Shad.DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <Shad.DialogHeader>
          <Shad.DialogTitle>Users in {tenantName}</Shad.DialogTitle>
          <Shad.DialogDescription>
            Manage users for this tenant organization
          </Shad.DialogDescription>
        </Shad.DialogHeader>

        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-muted-foreground">
            {users.length} user{users.length !== 1 ? "s" : ""}
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
            <Button size="sm" onClick={onCreateUser} iconName="Plus">
              Add User
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Icon name="LoaderCircle" className="animate-spin" size={24} />
              <span className="ml-2 text-muted-foreground">
                Loading users...
              </span>
            </div>
          ) : users.length === 0 ? (
            <Empty
              title="No users yet"
              description="Create the first user for this tenant. The first user must be an Admin."
              icon="Users"
            />
          ) : (
            <Shad.Table>
              <Shad.TableHeader>
                <Shad.TableRow>
                  <Shad.TableHead>User</Shad.TableHead>
                  <Shad.TableHead>Email</Shad.TableHead>
                  <Shad.TableHead>Role</Shad.TableHead>
                  <Shad.TableHead>Status</Shad.TableHead>
                  <Shad.TableHead>Created</Shad.TableHead>
                </Shad.TableRow>
              </Shad.TableHeader>
              <Shad.TableBody>
                {users.map((user) => (
                  <UserRow key={user.id} user={user} />
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
  );
}
