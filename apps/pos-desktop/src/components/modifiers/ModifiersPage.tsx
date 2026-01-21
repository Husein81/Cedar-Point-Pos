import { useState, useMemo } from "react";
import { Button, Icon, cn, Empty, Input } from "@repo/ui";
import { ModifierGroupItem } from "@/types/modifiers";
import { useAllModifierGroups } from "@/hooks/useModifiers";
import { useDeleteModifierGroup } from "@/hooks/useModifierGroupApi";
import { ModifierGroupCard } from "./ModifierGroupCard";
import { ModifierGroupForm } from "./ModifierGroupForm";
import { ModifierForm } from "./ModifierForm";
import { useModalStore } from "@/store/modalStore";

type ViewMode = "grid" | "list";
type FilterType = "ALL" | "SINGLE" | "MULTIPLE";

export const ModifiersPage = () => {
  const { openModal } = useModalStore();

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterType, setFilterType] = useState<FilterType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Data
  const { data: groupsResponse, isLoading, error } = useAllModifierGroups();
  const deleteGroup = useDeleteModifierGroup();

  // Normalize response
  const groups = groupsResponse?.data ?? [];

  // Filtering
  const filteredGroups = useMemo(() => {
    let result = groups;
    if (filterType !== "ALL") {
      result = result.filter((g) => g.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.modifiers?.some((m) => m.name.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [groups, filterType, searchQuery]);

  // --------------------
  // Modal handlers
  // --------------------

  const openCreateGroupModal = () => {
    openModal("Create Modifier Group", <ModifierGroupForm />);
  };

  const openEditGroupModal = (group: ModifierGroupItem) => {
    openModal(
      "Edit Modifier Group",
      <ModifierGroupForm editingGroup={group} />,
    );
  };

  const openAddModifierModal = (groupId: string) => {
    openModal("Add Modifier", <ModifierForm groupId={groupId} />);
  };

  const openEditModifierModal = (
    groupId: string,
    modifier: {
      id: string;
      name: string;
      price: number;
      productId?: string | null;
    },
  ) => {
    openModal(
      "Edit Modifier",
      <ModifierForm groupId={groupId} editingModifier={modifier} />,
    );
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this modifier group? This will also delete all modifiers in this group.",
      )
    ) {
      return;
    }
    deleteGroup.mutate(groupId);
  };

  // Expand / collapse
  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  };

  const expandAll = () =>
    setExpandedGroups(new Set(filteredGroups.map((g) => g.id)));

  const collapseAll = () => setExpandedGroups(new Set());

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-6 border-b bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Modifiers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage modifier groups and options for restaurant products
            </p>
          </div>
          <Button onClick={openCreateGroupModal}>
            <Icon name="Plus" className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative w-64">
              <Icon
                name="Search"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              />
              <Input
                placeholder="Search groups or modifiers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-9 pr-3 py-2 rounded-md border bg-background",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50",
                )}
              />
            </div>

            {/* Filter */}
            <div className="flex gap-1 border-b bg-muted p-1 rounded-xs">
              {(["ALL", "SINGLE", "MULTIPLE"] as FilterType[]).map((type) => (
                <Button
                  variant={filterType === type ? "default" : "ghost"}
                  size="sm"
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "px-3 py-1 text-sm rounded-xs hover:text-white",
                    filterType === type
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent",
                  )}
                >
                  {type === "ALL" ? "All" : type}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={expandAll}>
              <Icon name="ChevronsDown" />
            </Button>
            <Button variant="ghost" size="icon" onClick={collapseAll}>
              <Icon name="ChevronsUp" />
            </Button>

            <div className="flex gap-1 border-b bg-muted p-1 rounded-xs">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "default" : "ghost"}
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-xs",
                  viewMode === "grid" && "bg-primary text-primary-foreground",
                )}
              >
                <Icon name="LayoutGrid" />
              </Button>
              <Button
                size={"sm"}
                variant={viewMode === "list" ? "default" : "ghost"}
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-xs",
                  viewMode === "list" && "bg-primary text-primary-foreground",
                )}
              >
                <Icon name="List" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex justify-center h-64">
            <Icon name="LoaderCircle" className="animate-spin" />
          </div>
        ) : error ? (
          <Empty title="Failed to load modifiers" />
        ) : filteredGroups.length === 0 ? (
          <Empty
            title="No modifier groups"
            description={
              searchQuery
                ? "No groups match your search."
                : "Create your first modifier group."
            }
          />
        ) : (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-3",
            )}
          >
            {filteredGroups.map((group) => (
              <ModifierGroupCard
                key={group.id}
                group={group}
                viewMode={viewMode}
                isExpanded={expandedGroups.has(group.id)}
                onToggleExpand={() => toggleGroupExpanded(group.id)}
                onEdit={() => openEditGroupModal(group)}
                onDelete={() => handleDeleteGroup(group.id)}
                onAddModifier={() => openAddModifierModal(group.id)}
                onEditModifier={(m) => openEditModifierModal(group.id, m)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
