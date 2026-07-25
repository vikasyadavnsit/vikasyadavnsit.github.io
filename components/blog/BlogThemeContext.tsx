"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

type Mode = "light" | "dark";

interface BlogThemeContextType {
  mode: Mode;
  toggleMode: () => void;
}

const BlogThemeContext = createContext<BlogThemeContextType | undefined>(undefined);

export function BlogThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    const saved = localStorage.getItem("blog-mode") as Mode | null;
    if (saved === "light" || saved === "dark") {
      setMode(saved);
    }
  }, []);

  const toggleMode = () => {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    localStorage.setItem("blog-mode", next);
  };

  return (
    <BlogThemeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </BlogThemeContext.Provider>
  );
}

export function useBlogTheme() {
  const context = useContext(BlogThemeContext);
  if (context === undefined) {
    throw new Error("useBlogTheme must be used within a BlogThemeProvider");
  }
  return context;
}
