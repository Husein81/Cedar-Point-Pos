import { Shad } from "@repo/ui";
import { useModalStore } from "@/store/modalStore";

export const Modal = () => {
  const { isOpen, modalTitle, modalContent, closeModal } = useModalStore();

  return (
    <Shad.Dialog open={isOpen} onOpenChange={closeModal}>
      <Shad.DialogContent className="sm:max-w-125">
        <Shad.DialogHeader>
          <Shad.DialogTitle>{modalTitle}</Shad.DialogTitle>
        </Shad.DialogHeader>
        <div className="py-4">{modalContent}</div>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
