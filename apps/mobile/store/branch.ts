import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface BranchState {
  branchId: string | null;
  branchName: string | null;
  setBranch: (branch: { id: string; name: string }) => void;
  clearBranch: () => void;
}

const asyncStorage = createJSONStorage(() => AsyncStorage);

/** The branch this device is working against. Defaults to the signed-in
 * user's branch and can be switched from the Home screen. */
export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      branchId: null,
      branchName: null,
      setBranch: (branch) => set({ branchId: branch.id, branchName: branch.name }),
      clearBranch: () => set({ branchId: null, branchName: null }),
    }),
    {
      name: "mobile-branch",
      storage: asyncStorage,
    },
  ),
);
