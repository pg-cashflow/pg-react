import { useLocale } from "@/i18n";

export function AppLoadingScreen({ label }: { label?: string }) {
  const { t } = useLocale();
  const displayLabel = label ?? t("common.appName");

  return (
    <div className="min-h-screen grid place-items-center bg-bg">
      <div className="t-h1 font-extrabold text-accent">{displayLabel}</div>
    </div>
  );
}
