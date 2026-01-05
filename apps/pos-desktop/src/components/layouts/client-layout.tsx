import { Shad } from "@repo/ui";
import Sidebar from "../side-bar";

type Props = {
  children: React.ReactNode;
};

const ClientLayout = ({ children }: Props) => {
  return (
    <Shad.SidebarProvider defaultOpen={false}>
      <Sidebar />
      <Shad.SidebarInset className="flex-1 overflow-hidden">
        <div className="mt-12 px-6 py-4 container mx-auto">{children}</div>
      </Shad.SidebarInset>
    </Shad.SidebarProvider>
  );
};

export default ClientLayout;
