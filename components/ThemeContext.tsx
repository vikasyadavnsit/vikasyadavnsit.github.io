"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "blue" | "emerald" | "rose";
type Mode = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  mode: Mode;
  setTheme: (theme: Theme) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("blue");
  const [mode, setModeState] = useState<Mode>("dark");

  useEffect(() => {
    // Load saved settings
    const savedTheme = localStorage.getItem("portfolio-theme") as Theme;
    const savedMode = localStorage.getItem("portfolio-mode") as Mode;

    if (savedTheme) {
      setThemeState(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }

    if (savedMode) {
      setModeState(savedMode);
      if (savedMode === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      // Default to dark
      document.documentElement.classList.add("dark");
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("portfolio-theme", newTheme);
  };

  const toggleMode = () => {
    const newMode = mode === "light" ? "dark" : "light";
    setModeState(newMode);
    if (newMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("portfolio-mode", newMode);
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
