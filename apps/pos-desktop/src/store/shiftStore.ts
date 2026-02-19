import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type State = {
  currentShiftId: string | null;
  currentDeviceId: string | null;
};

type Actions = {
  setCurrentShiftId: (shiftId: string) => void;
  setCurrentDeviceId: (deviceId: string) => void;
  clearCurrentDeviceId: () => void;
  setShiftContext: (shiftId: string, deviceId: string) => void;
  clearShiftContext: () => void;
};

const SHIFT_STORAGE_KEY = "pos-shift-state";

export const useShiftStore = create<State & Actions>()(
  persist(
    (set) => ({
      currentShiftId: null,
      currentDeviceId: null,
      setCurrentShiftId: (shiftId: string) => {
        set(() => ({ currentShiftId: shiftId }));
      },
      setCurrentDeviceId: (deviceId: string) => {
        set(() => ({ currentDeviceId: deviceId }));
      },
      clearCurrentDeviceId: () => {
        set(() => ({ currentDeviceId: null }));
      },
      setShiftContext: (shiftId: string, deviceId: string) => {
        set(() => ({ currentShiftId: shiftId, currentDeviceId: deviceId }));
      },
      clearShiftContext: () => {
        set(() => ({ currentShiftId: null, currentDeviceId: null }));
      },
    }),
    {
      name: SHIFT_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
