import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type State = {
  branchId: string | null;
};

type Actions = {
  setBranchId: (branchId: string) => void;
  clearBranchId: () => void;
};

const BRANCH_STORAGE_KEY = "pos-branch-state";

export const useBranchStore = create<State & Actions>()(
  persist(
    (set) => ({
      branchId: null,
      setBranchId: (branchId: string) => {
        set(() => ({ branchId }));
      },
      clearBranchId: () => {
        set(() => ({ branchId: null }));
      },
    }),
    {
      name: BRANCH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
