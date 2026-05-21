import { Button, cn, Icon, Shad } from "@repo/ui";
import { useTheme } from "../../context/theme-provider";

type Mode = {
  label: string;
  value: "light" | "dark" | "system";
  icon: string;
};

const Appearance = () => {
  const { setTheme, theme } = useTheme();

  const modes: Mode[] = [
    { label: "Light", value: "light", icon: "Sun" },
    { label: "Dark", value: "dark", icon: "Moon" },
    { label: "System", value: "system", icon: "Laptop" },
  ];

  const isActive = (modeValue: string) => modeValue === theme;

  return (
    <Shad.Dialog>
      <Shad.DialogTrigger>
        <div className="flex item-center gap-2">
          <Icon name="Brush" className="mr-2" />
          <span>Appearance</span>
        </div>
      </Shad.DialogTrigger>

      <Shad.DialogContent className="sm:max-w-lg">
        <Shad.DialogHeader>
          <Shad.DialogTitle>Appearance Settings</Shad.DialogTitle>
          <Shad.DialogDescription>
            Customize the look and feel of the application.
          </Shad.DialogDescription>
        </Shad.DialogHeader>
        <div className="flex items-center gap-2">
          {modes.map((mode) => (
            <Button
              key={mode.value}
              variant="outline"
              className={cn("flex-1", {
                "border-2 border-primary dark:border-blue-500": isActive(
                  mode.value,
                ),
              })}
              onClick={() => setTheme(mode.value)}
              text={mode.label}
              iconName={mode.icon}
            />
          ))}
        </div>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
export default Appearance;
