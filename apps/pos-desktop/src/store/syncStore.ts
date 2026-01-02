import { create } from "zustand";

type SyncStats = {
  pending: number;
  synced: number;
  failed: number;
};

type State = {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  stats: SyncStats;
  error: string | null;
};

type Actions = {
  setOnline: (isOnline: boolean) => void;
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncTime: (time: Date) => void;
  setStats: (stats: SyncStats) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

const initialState: State = {
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncTime: null,
  stats: { pending: 0, synced: 0, failed: 0 },
  error: null,
};

export const useSyncStore = create<State & Actions>()((set) => ({
  ...initialState,

  setOnline: (isOnline) => set({ isOnline }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  setStats: (stats) => set({ stats }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
