import { useState, useMemo } from "react";
import { Button, Icon, Input, Empty, cn } from "@repo/ui";
import { useAllModifierGroups } from "@/hooks/useModifiers";
import { ModifierGroupCard } from "./ModifierGroupCard";
import { ModifierGroupForm } from "./ModifierGroupForm";
import { useModalStore } from "@/store/modalStore";
import Heading from "../heading";

type TypeFilter = "ALL" | "SINGLE" | "MULTIPLE";
type ViewMode = "grid" | "list";

export const ModifiersPage = () => {
  const { openModal } = useModalStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isAllExpanded, setIsAllExpanded] = useState(true);

  // Data
  const { data: groupsResponse, isLoading } = useAllModifierGroups();
  const groups = groupsResponse?.data ?? [];

  // Filtering
  const filteredGroups = useMemo(() => {
    let result = groups;

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.modifiers?.some((m) => m.name.toLowerCase().includes(q))
      );
    }

    // Apply type filter
    if (typeFilter !== "ALL") {
      result = result.filter((g) => g.type === typeFilter);
    }

    return result;
  }, [groups, searchQuery, typeFilter]);

  const handleCreateGroup = () => {
    openModal("Create Modifier Group", <ModifierGroupForm />);
  };

  return (
    <div className="space-y-4 pt-4">
      <Heading
        title="Modifiers"
        subtitle="Manage modifier groups and options for restaurant products"
      />

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left Side: Search + Type Filter Tabs */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-full max-w-sm">
            <Icon
              name="Search"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              placeholder="Search groups or modifiers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Type Filter Tabs - Individual Buttons */}
          <Button
            variant={typeFilter === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("ALL")}
          >
            All
          </Button>
          <Button
            variant={typeFilter === "SINGLE" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("SINGLE")}
          >
            Single
          </Button>
          <Button
            variant={typeFilter === "MULTIPLE" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("MULTIPLE")}
          >
            Multiple
          </Button>
        </div>

        {/* Right Side: View Toggle + Collapse All + Create Button */}
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="px-2"
              onClick={() => setViewMode("grid")}
            >
              <Icon name="LayoutGrid" className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="px-2"
              onClick={() => setViewMode("list")}
            >
              <Icon name="List" className="h-4 w-4" />
            </Button>
          </div>

          {/* Collapse All Button */}
          <div title={isAllExpanded ? "Collapse all cards" : "Expand all cards"}>
            <Button
              variant="ghost"
              size="sm"
              className="px-2"
              onClick={() => setIsAllExpanded(!isAllExpanded)}
            >
              <Icon
                name={isAllExpanded ? "ChevronsDown" : "ChevronsUp"}
                className="h-4 w-4"
              />
            </Button>
          </div>

          {/* Create Button */}
          <Button onClick={handleCreateGroup} iconName="Plus">
            Create Group
          </Button>
        </div>
      </div>

      {/* Cards/List Section - Always Visible */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Icon name="LoaderCircle" className="animate-spin h-8 w-8" />
        </div>
      ) : filteredGroups.length === 0 ? (
        <Empty
          title="No modifier groups"
          description={
            searchQuery || typeFilter !== "ALL"
              ? "No groups match your current filters."
              : "Create your first modifier group to get started."
          }
        />
      ) : (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "flex flex-col gap-3"
          )}
        >
          {filteredGroups.map((group) => (
            <ModifierGroupCard 
              key={group.id} 
              group={group} 
              viewMode={viewMode}
              forceExpanded={isAllExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};
