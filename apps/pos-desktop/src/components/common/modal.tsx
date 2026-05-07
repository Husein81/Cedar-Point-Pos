import { useModalStore } from "@/store/modalStore";
import { Shad } from "@repo/ui";

export const Modal = () => {
  const { isOpen, modalTitle, modalDescription, modalContent, closeModal } =
    useModalStore();

  return (
    <Shad.Dialog open={isOpen} onOpenChange={closeModal}>
      <Shad.DialogContent
        aria-describedby={undefined}
        className="max-w-7xl w-full"
      >
        <Shad.DialogHeader className="px-4">
          <Shad.DialogTitle>{modalTitle}</Shad.DialogTitle>
          {modalDescription && (
            <Shad.DialogDescription>{modalDescription}</Shad.DialogDescription>
          )}
        </Shad.DialogHeader>
        <Shad.ScrollArea className="max-h-[calc(100vh-10rem)] p-2">
          {modalContent}
          <Shad.ScrollBar />
        </Shad.ScrollArea>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
