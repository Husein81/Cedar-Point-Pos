import { create } from "zustand";

interface ModalState {
  isOpen: boolean;
  modalContent: React.ReactNode | null;
  modalTitle: string;
  openModal: (title: string, content: React.ReactNode) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isOpen: false,
  modalContent: null,
  modalTitle: "",
  openModal: (title: string, content: React.ReactNode) =>
    set({ isOpen: true, modalTitle: title, modalContent: content }),
  closeModal: () => set({ isOpen: false, modalContent: null, modalTitle: "" }),
}));
