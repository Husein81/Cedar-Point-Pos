import { useModalStore } from "@/store/modalStore";
import { Shad } from "@repo/ui";

export const Modal = () => {
  const { isOpen, modalTitle, modalDescription, modalContent, closeModal } =
    useModalStore();

  return (
    <Shad.Dialog open={isOpen} onOpenChange={closeModal}>
      <Shad.DialogContent
        aria-description={modalTitle}
        className="sm:!max-w-2xl w-full"
      >
        <Shad.DialogHeader className="px-4">
          <Shad.DialogTitle>{modalTitle}</Shad.DialogTitle>
          <Shad.DialogDescription>{modalDescription}</Shad.DialogDescription>
        </Shad.DialogHeader>
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-4 pb-2">
          {modalContent}
        </div>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
