import { useAllModifierGroups } from "@/hooks/useModifiers";
import { useModalStore } from "@/store/modalStore";
import { Button, Empty, Icon, Input, cn } from "@repo/ui";
import { useMemo, useState } from "react";
import { SkeletonCard } from "../common/SkeletonCard";
import TitleBar from "../title-bar";
import { ModifierGroupCard } from "./ModifierGroupCard";
import { ModifierGroupForm } from "./ModifierGroupForm";

type TypeFilter = "ALL" | "SINGLE" | "MULTIPLE";

export const ModifiersPage = () => {
  const { openModal } = useModalStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");

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
          g.modifiers?.some((m) => m.name.toLowerCase().includes(q)),
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
      <TitleBar
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

        {/* Create Button */}
        <Button onClick={handleCreateGroup} iconName="Plus">
          Create Group
        </Button>
      </div>

      {/* Cards/List Section - Always Visible */}
      {isLoading ? (
        <div
          className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4")}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
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
          className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4")}
        >
          {filteredGroups.map((group) => (
            <ModifierGroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
};
