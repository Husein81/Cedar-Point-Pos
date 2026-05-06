import type { Offer } from "@/dto/offers.dto";
import { useOffersPaginated } from "@/hooks/useOffers";
import { useModalStore } from "@/store/modalStore";
import { Button, Empty, Icon, Input, cn } from "@repo/ui";
import { useMemo, useState } from "react";
import { SkeletonCard } from "../common/SkeletonCard";
import Heading from "../heading";
import { OfferCard } from "./OfferCard";
import { OfferForm } from "./OfferForm";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export const OffersPage = () => {
  const { openModal } = useModalStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Data
  const { data: offersResponse, isLoading } = useOffersPaginated();
  const offers = offersResponse?.data ?? [];

  // Filtering
  const filteredOffers = useMemo(() => {
    let result = offers;

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((offer) => offer.name.toLowerCase().includes(q));
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

        {/* Right Side: Create Button */}
        <Button onClick={handleCreateOffer} iconName="Plus">
          Create Offer
        </Button>
      </div>

      {/* Cards/List Section */}
      {isLoading ? (
        <div
          className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4")}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
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
          className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4")}
        >
          {filteredOffers.map((offer: Offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      )}
    </div>
  );
};
