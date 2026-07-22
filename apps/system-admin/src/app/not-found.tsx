import { Button, Icon } from "@repo/ui";
import Link from "next/link";
import { Shad } from "@repo/ui";
import Sidebar from "@/components/side-bar";

export default function NotFound() {
  return (
    <Shad.SidebarProvider defaultOpen={false}>
      <Sidebar />
      <Shad.SidebarInset className="flex-1 flex flex-col overflow-hidden">
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <div className="bg-yellow-200/80 rounded-full size-12 flex items-center justify-center">
            <Icon name="TriangleAlert" className="size-8 text-yellow-500" />
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            Page Under Construction
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            The page you are looking for is currently being built.
          </p>

          <Button>
            <Link href="/">Go back to Home</Link>
          </Button>
        </div>
      </Shad.SidebarInset>
    </Shad.SidebarProvider>
  );
}
