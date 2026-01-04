import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@repo/ui";
import { useModalStore } from "@/store/modalStore";

export const Modal = () => {
  const { isOpen, modalTitle, modalContent, closeModal } = useModalStore();

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>
        <div className="py-4">{modalContent}</div>
      </DialogContent>
    </Dialog>
  );
};
