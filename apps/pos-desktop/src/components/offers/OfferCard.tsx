import React, { useState } from "react";
import { Button, Icon, Shad, cn } from "@repo/ui";
import type { Offer, OfferGroup, OfferGroupItem } from "@/dto/offers.dto";
import { useDeleteOffer, useUpdateOffer, useDeleteOfferGroup, useRemoveOfferGroupItem } from "@/hooks/useOffers";
import { useBaseCurrency } from "@/hooks/useCurrency";
import { useModalStore } from "@/store/modalStore";
import { OfferForm } from "./OfferForm";
import { OfferGroupForm } from "./OfferGroupForm";
import { OfferGroupItemForm } from "./OfferGroupItemForm";

type OfferCardProps = {
  offer: Offer;
  viewMode?: "grid" | "list";
  forceExpanded?: boolean;
};

export const OfferCard = ({
  offer,
  viewMode = "grid",
  forceExpanded = true,
}: OfferCardProps) => {
  const { openModal } = useModalStore();
  const { format: formatMoney } = useBaseCurrency();
  const [isExpanded, setIsExpanded] = useState(forceExpanded);

  const deleteOffer = useDeleteOffer();
  const updateOffer = useUpdateOffer();
  const deleteGroup = useDeleteOfferGroup();
  const removeItem = useRemoveOfferGroupItem();

  const handleEdit = () => {
    openModal("Edit Offer", <OfferForm offer={offer} />);
  };

  const handleAddGroup = () => {
    openModal("Add Group", <OfferGroupForm offerId={offer.id} />);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete offer "${offer.name}"? This cannot be undone.`)) {
      deleteOffer.mutate(offer.id);
    }
  };

  const handleToggleActive = () => {
    updateOffer.mutate({
      id: offer.id,
      data: { isActive: !offer.isActive },
    });
  };

  const handleEditGroup = (group: OfferGroup) => {
    openModal(
      "Edit Group",
      <OfferGroupForm offerId={offer.id} group={group} />,
    );
  };

  const handleDeleteGroup = (group: OfferGroup) => {
    if (window.confirm(`Delete group "${group.name}"?`)) {
      deleteGroup.mutate({ offerId: offer.id, groupId: group.id });
    }
  };

  const handleAddItem = (group: OfferGroup) => {
    openModal(
      "Add Product to Group",
      <OfferGroupItemForm offerId={offer.id} groupId={group.id} />,
    );
  };

  const handleRemoveItem = (group: OfferGroup, item: OfferGroupItem) => {
    if (window.confirm(`Remove "${item.product.name}" from this group?`)) {
      removeItem.mutate({
        offerId: offer.id,
        groupId: group.id,
        itemId: item.id,
      });
    }
  };

  const groupCount = offer.offerGroups?.length ?? offer._count?.offerGroups ?? 0;

  return (
    <Shad.Card
      className={cn(
        "overflow-hidden transition-shadow hover:shadow-md",
        viewMode === "list" && "flex flex-col",
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Icon name="BadgePercent" className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{offer.name}</h3>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  offer.isActive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
                )}
              >
                {offer.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-primary">
                {formatMoney(offer.basePrice)}
              </span>
              <span>•</span>
              <span>
                {groupCount} {groupCount === 1 ? "group" : "groups"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={(e) => {
              (e as React.MouseEvent).stopPropagation();
              handleToggleActive();
            }}
          >
            <Icon
              name={offer.isActive ? "EyeOff" : "Eye"}
              className="h-4 w-4"
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={(e) => {
              (e as React.MouseEvent).stopPropagation();
              handleEdit();
            }}
          >
            <Icon name="Pencil" className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-2 text-destructive hover:text-destructive"
            onClick={(e) => {
              (e as React.MouseEvent).stopPropagation();
              handleDelete();
            }}
          >
            <Icon name="Trash2" className="h-4 w-4" />
          </Button>
          <Icon
            name={isExpanded ? "ChevronUp" : "ChevronDown"}
            className="h-4 w-4 text-muted-foreground ml-1"
          />
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t px-4 pb-4">
          {/* Groups */}
          {offer.offerGroups && offer.offerGroups.length > 0 ? (
            <div className="space-y-3 mt-3">
              {offer.offerGroups.map((group) => (
                <div
                  key={group.id}
                  className="border rounded-lg p-3 bg-muted/30"
                >
                  {/* Group Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">{group.name}</h4>
                      {group.freeItemsCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {group.freeItemsCount} free
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleAddItem(group)}
                      >
                        <Icon name="Plus" className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleEditGroup(group)}
                      >
                        <Icon name="Pencil" className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteGroup(group)}
                      >
                        <Icon name="Trash2" className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Group Items */}
                  {group.offerGroupItems &&
                  group.offerGroupItems.length > 0 ? (
                    <div className="space-y-1">
                      {group.offerGroupItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50"
                        >
                          <span className="text-foreground">
                            {item.product.name}
                          </span>
                          <div className="flex items-center gap-2">
                            {Number(item.extraPrice) > 0 && (
                              <span className="text-xs text-muted-foreground">
                                +{formatMoney(item.extraPrice)}
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveItem(group, item)}
                            >
                              <Icon name="X" className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No products in this group yet
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-3 italic">
              No groups yet. Add a group to configure this offer.
            </p>
          )}

          {/* Add Group Button */}
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={handleAddGroup}
          >
            <Icon name="Plus" className="h-4 w-4 mr-1" />
            Add Group
          </Button>
        </div>
      )}
    </Shad.Card>
  );
};
