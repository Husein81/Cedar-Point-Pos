import { MMKV } from "react-native-mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const mmkv = new MMKV();

interface BranchState {
  branchId: string | null;
  branchName: string | null;
  setBranch: (branch: { id: string; name: string }) => void;
  clearBranch: () => void;
}

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    const value = mmkv.getString(name);
    return value ? JSON.parse(value) : null;
  },
  setItem: (name: string, value: unknown) => {
    mmkv.set(name, JSON.stringify(value));
  },
  removeItem: (name: string) => {
    mmkv.delete(name);
  },
}));

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
      storage: mmkvStorage,
    },
  ),
);
