import { useTheme } from "next-themes";
import { IconMoon, IconSun } from "@tabler/icons-react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      type="button"
      className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer p-1 rounded-sm hover:bg-surface-container-highest"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title="Toggle theme"
    >
      {theme === "dark" ? <IconSun className="size-5" /> : <IconMoon className="size-5" />}
    </button>
  );
}
