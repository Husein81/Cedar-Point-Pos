import { useModalStore } from "@/store/modalStore";
import { Shad } from "@repo/ui";

export const Modal = () => {
  const { isOpen, modalTitle, modalDescription, modalContent, closeModal } =
    useModalStore();

  return (
    <Shad.Dialog open={isOpen} onOpenChange={closeModal}>
      <Shad.DialogContent
        aria-describedby={undefined}
        className="min-w-2xl w-full"
      >
        <Shad.DialogHeader className="px-4">
          <Shad.DialogTitle>{modalTitle}</Shad.DialogTitle>
          {modalDescription && (
            <Shad.DialogDescription>{modalDescription}</Shad.DialogDescription>
          )}
        </Shad.DialogHeader>
        {/*
          Force Radix's internal viewport wrapper (display:table by default) to
          block so inner content can use `w-full` against a definite width and
          manage its own horizontal overflow instead of bleeding past the
          dialog. Scoped here so no other ScrollArea is affected.
        */}
        <Shad.ScrollArea className="max-h-[calc(100vh-10rem)] p-2 [&_[data-slot=scroll-area-viewport]>div]:!block">
          {modalContent}
          <Shad.ScrollBar />
        </Shad.ScrollArea>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
