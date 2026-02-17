import { Shad } from "@repo/ui";
import NavDrawer from "../nav-drawer";
import { createContext, useContext, useState } from "react";

type Props = {
  children: React.ReactNode;
};

type DrawerContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export const useOptionalDrawer = () => useContext(DrawerContext);

export const useDrawer = () => {
  const context = useOptionalDrawer();
  if (!context) {
    throw new Error("useDrawer must be used within ClientLayout");
  }
  return context;
};

const ClientLayout = ({ children }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <DrawerContext.Provider value={{ open, setOpen }}>
      <NavDrawer open={open} onOpenChange={setOpen} />
      <div className="flex-1 h-full overflow-hidden">
        <Shad.ScrollArea className="h-full">
          <div className="px-6 py-8 mx-auto">{children}</div>
          <Shad.ScrollBar />
        </Shad.ScrollArea>
      </div>
    </DrawerContext.Provider>
  );
};

export default ClientLayout;
