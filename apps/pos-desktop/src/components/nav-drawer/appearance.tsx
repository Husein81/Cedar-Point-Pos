import { Button, cn, Icon, Shad } from "@repo/ui";
import { useTheme } from "../providers/theme-providers";
import { useLocale } from "../providers/locale-provider";

type Mode = {
  labelKey: string;
  value: "light" | "dark" | "system";
  icon: string;
};

const modes: Mode[] = [
  { labelKey: "Light", value: "light", icon: "Sun" },
  { labelKey: "Dark", value: "dark", icon: "Moon" },
  { labelKey: "System", value: "system", icon: "Laptop" },
];

const Appearance = () => {
  const { setTheme, theme } = useTheme();
  const { t } = useLocale();

  const isActive = (modeValue: string) => modeValue === theme;

  return (
    <Shad.Dialog>
      <Shad.DialogTrigger>
        <div className="flex item-center gap-2">
          <Icon name="Brush" className="me-2" />
          <span>{t("Appearance")}</span>
        </div>
      </Shad.DialogTrigger>

      <Shad.DialogContent className="sm:max-w-lg">
        <Shad.DialogHeader>
          <Shad.DialogTitle>{t("Appearance Settings")}</Shad.DialogTitle>
          <Shad.DialogDescription>
            {t("Customize the look and feel of the application.")}
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
              text={t(mode.labelKey)}
              iconName={mode.icon}
            />
          ))}
        </div>
      </Shad.DialogContent>
    </Shad.Dialog>
  );
};
export default Appearance;
