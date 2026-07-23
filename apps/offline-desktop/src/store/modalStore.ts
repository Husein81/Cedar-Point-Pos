import { create } from "zustand";

type ModalState = {
  isOpen: boolean;
  modalContent: React.ReactNode | null;
  modalTitle: string;
  modalDescription?: string;
  openModal: (
    title: string,
    content: React.ReactNode,
    description?: string,
  ) => void;
  closeModal: () => void;
};

export const useModalStore = create<ModalState>((set) => ({
  isOpen: false,
  modalContent: null,
  modalTitle: "",
  modalDescription: "",
  openModal: (title, content, description) =>
    set({
      isOpen: true,
      modalTitle: title,
      modalDescription: description,
      modalContent: content,
    }),
  closeModal: () =>
    set({
      isOpen: false,
      modalContent: null,
      modalTitle: "",
      modalDescription: "",
    }),
}));
