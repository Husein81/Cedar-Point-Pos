import { Button, Shad } from "@repo/ui";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/theme-provider";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <Shad.DropdownMenu>
      <Shad.DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="no-drag">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </Shad.DropdownMenuTrigger>
      <Shad.DropdownMenuContent align="end">
        <Shad.DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </Shad.DropdownMenuItem>
        <Shad.DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </Shad.DropdownMenuItem>
        <Shad.DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </Shad.DropdownMenuItem>
      </Shad.DropdownMenuContent>
    </Shad.DropdownMenu>
  );
}
