"use client";
import { Sun, Moon } from "lucide-react";
import { useBlogTheme } from "./BlogThemeContext";

export default function BlogThemeToggle() {
  const { mode, toggleMode } = useBlogTheme();

  return (
    <button
      onClick={toggleMode}
      aria-label="Toggle blog theme"
      className="p-2 rounded-full border border-[hsl(var(--blog-border))] text-[hsl(var(--blog-fg))] hover:bg-[hsl(var(--blog-card))] transition-colors"
    >
      {mode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
