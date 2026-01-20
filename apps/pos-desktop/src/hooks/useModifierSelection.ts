import { useState, useCallback, useEffect, useMemo } from "react";
import { ModifierGroup, SelectedModifier } from "@/types/modifiers";
import {
  validateModifierSelections,
  calculateModifierTotal,
  getSelectedModifiersArray,
  getSelectedModifierIds,
} from "@/utils/modifierHelpers";

interface UseModifierSelectionProps {
  groups?: ModifierGroup | undefined;
  initialModifiers?: SelectedModifier[];
}

export const useModifierSelection = ({
  groups = undefined,
  initialModifiers = [],
}: UseModifierSelectionProps) => {
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    if (
      !groups ||
      !groups.modifierGroups ||
      !groups.modifierGroups.length ||
      !initialModifiers.length
    )
      return;

    const initialSelections: Record<string, Set<string>> = {};

    for (const modifier of initialModifiers) {
      const group = groups.modifierGroups.find((g) =>
        g.modifiers.some((m) => m.id === modifier.modifierId),
      );

      if (!group) continue;

      if (!initialSelections[group.id]) {
        initialSelections[group.id] = new Set();
      }

      initialSelections[group.id]!.add(modifier.modifierId);
    }

    setSelections(initialSelections);
  }, [groups, initialModifiers]);

  const toggleModifier = useCallback(
    (groupId: string, modifierId: string, groupType: "SINGLE" | "MULTIPLE") => {
      setSelections((prev) => {
        const next = { ...prev };
        const current = new Set(prev[groupId] ?? []);

        if (groupType === "SINGLE") {
          if (current.has(modifierId)) {
            // Deselect if already selected
            current.delete(modifierId);
          } else {
            // SINGLE = always exactly one
            current.clear();
            current.add(modifierId);
          }
        } else {
          // MULTIPLE = toggle
          current.has(modifierId)
            ? current.delete(modifierId)
            : current.add(modifierId);
        }

        next[groupId] = current;
        return next;
      });
    },
    [],
  );

  /**
   * ----------------------------------------
   * Selectors
   * ----------------------------------------
   */
  const isSelected = useCallback(
    (groupId: string, modifierId: string) =>
      selections[groupId]?.has(modifierId) ?? false,
    [selections],
  );

  const getGroupSelectionCount = useCallback(
    (groupId: string) => selections[groupId]?.size ?? 0,
    [selections],
  );

  /**
   * ----------------------------------------
   * Validation
   * ----------------------------------------
   */
  const validate = useCallback(
    () => validateModifierSelections(groups, selections),
    [groups, selections],
  );

  /**
   * ----------------------------------------
   * Derived values (memoized)
   * ----------------------------------------
   */
  const totalModifierPrice = useMemo(
    () => calculateModifierTotal(groups, selections),
    [groups, selections],
  );

  const selectedModifiers = useMemo(
    () => getSelectedModifiersArray(groups, selections),
    [groups, selections],
  );

  const selectedModifierIds = useMemo(
    () => getSelectedModifierIds(selections),
    [selections],
  );

  const hasSelections = useMemo(
    () => Object.values(selections).some((set) => set.size > 0),
    [selections],
  );

  /**
   * ----------------------------------------
   * Reset
   * ----------------------------------------
   */
  const reset = useCallback(() => {
    setSelections({});
  }, []);

  return {
    // State
    selections,
    selectedModifiers,
    selectedModifierIds,
    totalModifierPrice,
    hasSelections,

    // Actions
    toggleModifier,
    isSelected,
    getGroupSelectionCount,
    validate,
    reset,
  };
};
