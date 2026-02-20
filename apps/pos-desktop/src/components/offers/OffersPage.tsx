import { useState, useMemo } from "react";
import { Button, Icon, Input, Empty, cn } from "@repo/ui";
import { useOffersPaginated } from "@/hooks/useOffers";
import { OfferCard } from "./OfferCard";
import { OfferForm } from "./OfferForm";
import { useModalStore } from "@/store/modalStore";
import Heading from "../heading";
import type { Offer } from "@/dto/offers.dto";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type ViewMode = "grid" | "list";

export const OffersPage = () => {
  const { openModal } = useModalStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isAllExpanded, setIsAllExpanded] = useState(true);

  // Data
  const { data: offersResponse, isLoading } = useOffersPaginated();
  const offers = offersResponse?.data ?? [];

  // Filtering
  const filteredOffers = useMemo(() => {
    let result = offers;

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((offer) =>
        offer.name.toLowerCase().includes(q),
      );
    }

    // Apply status filter
    if (statusFilter === "ACTIVE") {
      result = result.filter((offer) => offer.isActive);
    } else if (statusFilter === "INACTIVE") {
      result = result.filter((offer) => !offer.isActive);
    }

    return result;
  }, [offers, searchQuery, statusFilter]);

  const handleCreateOffer = () => {
    openModal("Create Offer", <OfferForm />);
  };

  return (
    <div className="space-y-4 pt-4">
      <Heading
        title="Offers"
        subtitle="Manage combo offers, bundles, and meal deals"
      />

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left Side: Search + Status Filter Tabs */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-full max-w-sm">
            <Icon
              name="Search"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              placeholder="Search offers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter Tabs */}
          <Button
            variant={statusFilter === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("ALL")}
          >
            All
          </Button>
          <Button
            variant={statusFilter === "ACTIVE" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("ACTIVE")}
          >
            Active
          </Button>
          <Button
            variant={statusFilter === "INACTIVE" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("INACTIVE")}
          >
            Inactive
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
          <Button onClick={handleCreateOffer} iconName="Plus">
            Create Offer
          </Button>
        </div>
      </div>

      {/* Cards/List Section */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Icon name="LoaderCircle" className="animate-spin h-8 w-8" />
        </div>
      ) : filteredOffers.length === 0 ? (
        <Empty
          title="No offers"
          description={
            searchQuery || statusFilter !== "ALL"
              ? "No offers match your current filters."
              : "Create your first offer to get started."
          }
        />
      ) : (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "flex flex-col gap-3",
          )}
        >
          {filteredOffers.map((offer: Offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              viewMode={viewMode}
              forceExpanded={isAllExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};
