import { Shad } from "@repo/ui";
import Sidebar from "../side-bar";

type Props = {
  children: React.ReactNode;
};

const ClientLayout = ({ children }: Props) => {
  return (
    <Shad.SidebarProvider>
      <Sidebar />
      <Shad.SidebarInset>
        <div className="container mt-12 pl-4">{children}</div>
      </Shad.SidebarInset>
    </Shad.SidebarProvider>
  );
};

export default ClientLayout;
