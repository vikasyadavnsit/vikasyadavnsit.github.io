"use client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Linkedin, Palette, Check, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeContext";
import { useState } from "react";

const navItems = [
  { name: "Expertise", href: "#expertise" },
  { name: "Experience", href: "#experience" },
  { name: "About", href: "#about" },
  { name: "Projects", href: "#work" },
];

const themes = [
  { id: "blue", name: "Indigo", color: "bg-blue-500" },
  { id: "emerald", name: "Emerald", color: "bg-emerald-500" },
  { id: "rose", name: "Rose", color: "bg-rose-500" },
] as const;

export default function Navbar() {
  const { theme, mode, setTheme, toggleMode } = useTheme();
  const [showThemePicker, setShowThemePicker] = useState(false);

  return (
    <nav className="fixed top-4 md:top-8 left-0 right-0 z-[100] flex justify-center px-4">
      <div className="relative flex flex-col items-center gap-4">
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="flex items-center gap-1 p-1.5 md:p-2 bg-background/60 backdrop-blur-2xl border border-border rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-colors duration-700"
        >
          {navItems.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={cn(
                "px-3 md:px-5 py-1.5 md:py-2.5 text-[10px] md:text-xs font-semibold tracking-wider uppercase transition-all rounded-full hover:bg-foreground/5 whitespace-nowrap",
                "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.name}
            </a>
          ))}

          <div className="w-px h-4 bg-border mx-1 md:mx-2" />

          {/* Mode Toggle */}
          <button
            onClick={toggleMode}
            className="p-2 md:p-2.5 rounded-full hover:bg-foreground/5 transition-all group"
            title={mode === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {mode === 'dark' ? (
              <Sun className="w-4 h-4 md:w-4.5 md:h-4.5 text-muted-foreground group-hover:text-foreground" />
            ) : (
              <Moon className="w-4 h-4 md:w-4.5 md:h-4.5 text-muted-foreground group-hover:text-foreground" />
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setShowThemePicker(!showThemePicker)}
            className="p-2 md:p-2.5 rounded-full hover:bg-foreground/5 transition-all relative group"
            title="Change Accent Color"
          >
            <Palette className="w-4 h-4 md:w-4.5 md:h-4.5 text-muted-foreground group-hover:text-foreground" />
            {showThemePicker && (
              <motion.div
                layoutId="active-dot"
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full shadow-lg"
                style={{ backgroundColor: 'hsl(var(--primary))' }}
              />
            )}
          </button>

          <div className="w-px h-4 bg-border mx-1 md:mx-2" />

          <a
            href="https://www.linkedin.com/in/heyiamvikasyadav/"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group flex items-center gap-2 px-3 md:px-5 py-1.5 md:py-2.5 text-[10px] md:text-xs font-bold rounded-full transition-all whitespace-nowrap shadow-lg hover:shadow-primary/20",
              "bg-foreground text-background hover:brightness-110"
            )}
          >
            <Linkedin className="w-3 h-3 md:w-3.5 md:h-3.5 transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline">Connect</span>
          </a>
        </motion.div>

        {/* Theme Picker Dropdown */}
        <AnimatePresence>
          {showThemePicker && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="p-2 bg-background/80 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex gap-2 transition-colors duration-700"
            >
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setShowThemePicker(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:bg-foreground/5",
                    theme === t.id ? "bg-foreground/10" : ""
                  )}
                >
                  <div className={cn("w-4 h-4 rounded-full shadow-sm", t.color)} />
                  <span className="text-xs font-medium text-foreground">{t.name}</span>
                  {theme === t.id && <Check className="w-3 h-3 ml-1 text-primary" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
