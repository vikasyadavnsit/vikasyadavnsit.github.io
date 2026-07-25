"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronRight, BookOpen } from "lucide-react";
import { useTheme } from "@/components/ThemeContext";
import {
  subscribeToProjects,
  subscribeToProject,
  subscribeToFlags,
} from "./lib/firebase-ops";
import type { FlagbaseProject, FlagbaseFlag, View } from "./lib/types";
import LandingView from "./components/LandingView";
import DashboardView from "./components/DashboardView";
import ProjectView from "./components/ProjectView";
import FlagDetailView from "./components/FlagDetailView";
import DocsView from "./components/DocsView";

export default function FlagbasePage() {
  const { mode } = useTheme();
  const accent = mode === "dark" ? "#a78bfa" : "#7c3aed";
  const accentGlow = mode === "dark" ? "rgba(167,139,250,0.13)" : "rgba(124,58,237,0.10)";

  const [view, setView] = useState<View>("landing");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [flagId, setFlagId] = useState<string | null>(null);

  const [projects, setProjects] = useState<FlagbaseProject[]>([]);
  const [currentProject, setCurrentProject] = useState<FlagbaseProject | null>(null);
  const [flags, setFlags] = useState<FlagbaseFlag[]>([]);

  const currentFlag = flagId ? flags.find((f) => f.id === flagId) ?? null : null;

  // Subscribe to projects list once we leave landing
  useEffect(() => {
    if (view === "landing") return;
    const unsub = subscribeToProjects(setProjects);
    return unsub;
  }, [view]);

  // Subscribe to single project metadata
  useEffect(() => {
    if (!projectId) { setCurrentProject(null); return; }
    const unsub = subscribeToProject(projectId, setCurrentProject);
    return unsub;
  }, [projectId]);

  // Subscribe to flags for current project
  useEffect(() => {
    if (!projectId) { setFlags([]); return; }
    const unsub = subscribeToFlags(projectId, setFlags);
    return unsub;
  }, [projectId]);

  const goToDashboard = () => {
    setView("dashboard");
    setProjectId(null);
    setFlagId(null);
  };

  const goToProject = (pid: string) => {
    setProjectId(pid);
    setFlagId(null);
    setView("project");
  };

  const goToFlag = (fid: string) => {
    setFlagId(fid);
    setView("flag-detail");
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Fixed nav bar */}
      <header className="fixed top-0 left-0 right-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm min-w-0">
            {view === "landing" || view === "dashboard" ? (
              <Link
                href="/projects/creative-stuff"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/40 transition-all flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={
                  view === "flag-detail" ? () => goToProject(projectId!) :
                  view === "docs" ? goToDashboard :
                  goToDashboard
                }
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/40 transition-all flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={goToDashboard}
              className={`font-bold text-base hover:opacity-80 transition-opacity flex-shrink-0 ${
                view === "landing" ? "pointer-events-none" : ""
              }`}
            >
              <span style={{ color: accent }}>Flag</span>base
            </button>

            {(view === "project" || view === "flag-detail") && currentProject && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <button
                  onClick={() => goToProject(projectId!)}
                  className="font-medium hover:text-primary transition-colors truncate max-w-[160px]"
                >
                  {currentProject.name}
                </button>
              </>
            )}

            {view === "flag-detail" && currentFlag && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium truncate max-w-[120px]">{currentFlag.name}</span>
              </>
            )}

            {view === "docs" && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium">Documentation</span>
              </>
            )}
          </nav>

          {/* Right-side actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setView("docs")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:bg-muted/40"
              style={view === "docs" ? { color: accent } : { color: undefined }}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Docs</span>
            </button>
            {view === "landing" && (
              <button
                onClick={goToDashboard}
                className="px-4 py-2 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95"
                style={{ background: accent, color: "#fff" }}
              >
                Dashboard
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Views */}
      <div className="pt-16">
        <AnimatePresence mode="wait">
          {view === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <LandingView onGetStarted={goToDashboard} accent={accent} accentGlow={accentGlow} />
            </motion.div>
          )}

          {view === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
            >
              <DashboardView
                projects={projects}
                onSelectProject={goToProject}
                accent={accent}
                accentGlow={accentGlow}
              />
            </motion.div>
          )}

          {view === "project" && currentProject && (
            <motion.div
              key={`project-${projectId}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
            >
              <ProjectView
                project={currentProject}
                flags={flags}
                onSelectFlag={goToFlag}
                accent={accent}
                accentGlow={accentGlow}
              />
            </motion.div>
          )}

          {view === "flag-detail" && currentProject && currentFlag && (
            <motion.div
              key={`flag-${flagId}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
            >
              <FlagDetailView
                project={currentProject}
                flag={currentFlag}
                accent={accent}
                accentGlow={accentGlow}
              />
            </motion.div>
          )}

          {view === "docs" && (
            <motion.div
              key="docs"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
            >
              <DocsView accent={accent} accentGlow={accentGlow} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
