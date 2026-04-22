import { reatomComponent, useWrap } from "@reatom/react";
import { localeAtom, setLocaleAction } from "../application/i18n-atoms";
import { cn } from "@/shared/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher = reatomComponent(({ className }: LanguageSwitcherProps) => {
  const currentLocale = localeAtom();

  return (
    <div
      data-slot="language-switcher"
      className={cn("flex items-center gap-1", className)}
    >
      <button
        type="button"
        className={cn(
          "px-2 py-1 text-xs font-bold transition-colors cursor-pointer",
          currentLocale === "ru"
            ? "text-primary"
            : "text-on-surface-variant hover:text-on-surface",
        )}
        onClick={useWrap(() => setLocaleAction("ru"))}
      >
        RU
      </button>
      <span className="text-on-surface-variant/30 text-xs">/</span>
      <button
        type="button"
        className={cn(
          "px-2 py-1 text-xs font-bold transition-colors cursor-pointer",
          currentLocale === "en"
            ? "text-primary"
            : "text-on-surface-variant hover:text-on-surface",
        )}
        onClick={useWrap(() => setLocaleAction("en"))}
      >
        EN
      </button>
    </div>
  );
}, "LanguageSwitcher");
