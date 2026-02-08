import { useModalStore } from "@/store/modalStore";
import { Shad } from "@repo/ui";

export const Modal = () => {
  const { isOpen, modalTitle, modalDescription, modalContent, closeModal } =
    useModalStore();

  return (
    <Shad.Dialog open={isOpen} onOpenChange={closeModal}>
      <Shad.DialogContent aria-description={modalTitle} className="min-w-250">
        <Shad.DialogHeader className="px-4">
          <Shad.DialogTitle>{modalTitle}</Shad.DialogTitle>
          <Shad.DialogDescription>{modalDescription}</Shad.DialogDescription>
        </Shad.DialogHeader>
        <Shad.ScrollArea className="max-h-[calc(100vh-10rem)] p-2">
          {modalContent}
          <Shad.ScrollBar />
        </Shad.ScrollArea>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
