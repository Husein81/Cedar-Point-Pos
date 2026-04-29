import { createFileRoute } from "@tanstack/react-router";
import { useLocale } from "@/components/providers/locale-provider";
import Heading from "@/components/heading";
import { Button, cn, Icon, Shad } from "@repo/ui";
import type { Locale } from "@/i18n/translations";

export const Route = createFileRoute("/settings/language")({
  component: LanguageSettingsPage,
  staticData: {
    breadcrumb: "Language",
  },
});

type LanguageOption = {
  value: Locale;
  label: string;
  nativeLabel: string;
};

const languageOptions: LanguageOption[] = [
  { value: "en", label: "English", nativeLabel: "English" },
  { value: "ar", label: "Arabic", nativeLabel: "العربية" },
];

function LanguageSettingsPage() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="space-y-4 pt-4">
      <Heading
        title={t("Language")}
        subtitle={t("Switch between Arabic and English interface")}
        href="/settings"
      />

      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Icon
          name="Info"
          className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0"
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {t("Language")}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {t(
              "Changing the language updates the interface direction and text. Arabic uses right-to-left layout.",
            )}
          </p>
        </div>
      </div>

      <Shad.Card>
        <Shad.CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {languageOptions.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                className={cn("flex-1 gap-2", {
                  "border-2 border-primary dark:border-blue-500":
                    locale === option.value,
                })}
                onClick={() => setLocale(option.value)}
              >
                <span>{t(option.label)}</span>
                {option.value === "ar" && (
                  <span className="text-muted-foreground text-xs">
                    ({option.nativeLabel})
                  </span>
                )}
              </Button>
            ))}
          </div>
        </Shad.CardContent>
      </Shad.Card>
    </div>
  );
}
