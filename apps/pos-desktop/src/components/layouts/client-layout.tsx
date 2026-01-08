import { Shad } from "@repo/ui";
import Sidebar from "../side-bar";

type Props = {
  children: React.ReactNode;
};

const ClientLayout = ({ children }: Props) => {
  return (
    <Shad.SidebarProvider defaultOpen={false}>
      <Sidebar />
      <Shad.SidebarInset className="flex-1 h-full overflow-hidden">
        <Shad.ScrollArea className="h-full">
          <div className="px-6 py-8 container mx-auto">{children}</div>
          <Shad.ScrollBar />
        </Shad.ScrollArea>
      </Shad.SidebarInset>
    </Shad.SidebarProvider>
  );
};

export default ClientLayout;
