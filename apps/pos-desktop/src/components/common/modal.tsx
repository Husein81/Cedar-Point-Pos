import { Shad } from "@repo/ui";
import { useModalStore } from "@/store/modalStore";

export const Modal = () => {
  const { isOpen, modalTitle, modalContent, closeModal } = useModalStore();

  return (
    <Shad.Dialog open={isOpen} onOpenChange={closeModal}>
      <Shad.DialogContent className="sm:max-w-145">
        <Shad.DialogHeader className="px-4">
          <Shad.DialogTitle>{modalTitle}</Shad.DialogTitle>
        </Shad.DialogHeader>
        <Shad.ScrollArea className="max-h-[calc(100vh-10rem)] p-4">
          {modalContent}
          <Shad.ScrollBar />
        </Shad.ScrollArea>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
