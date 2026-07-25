"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FolderOpen, Trash2, X, ArrowRight, Layers } from "lucide-react";
import { createProject, deleteProject } from "../lib/firebase-ops";
import type { FlagbaseProject } from "../lib/types";

interface Props {
  projects: FlagbaseProject[];
  onSelectProject: (id: string) => void;
  accent: string;
  accentGlow: string;
}

export default function DashboardView({ projects, onSelectProject, accent, accentGlow }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [envInput, setEnvInput] = useState("development, staging, production");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const environments = envInput
      .split(",")
      .map((s) => s.trim().toLowerCase().replace(/\s+/g, "-"))
      .filter(Boolean);
    await createProject({
      name: name.trim(),
      description: description.trim(),
      environments: environments.length ? environments : ["development", "staging", "production"],
      createdAt: Date.now(),
    });
    setName("");
    setDescription("");
    setEnvInput("development, staging, production");
    setSaving(false);
    setShowCreate(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all hover:scale-105 active:scale-95"
          style={{ background: accent, color: "#fff" }}
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-24 border border-dashed border-border rounded-[2rem]"
        >
          <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No projects yet. Create one to get started.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="group relative p-6 rounded-[2rem] border border-border bg-card/40 backdrop-blur-xl hover:border-primary/20 transition-all cursor-pointer"
              onClick={() => onSelectProject(p.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl" style={{ background: accentGlow }}>
                    <FolderOpen className="w-5 h-5" style={{ color: accent }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }}
                  className="p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {p.description && (
                <p className="text-sm text-muted-foreground mb-4">{p.description}</p>
              )}

              <div className="flex flex-wrap gap-2 mb-5">
                {p.environments.map((env) => (
                  <span
                    key={env}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-muted/40 capitalize"
                  >
                    {env}
                  </span>
                ))}
              </div>

              <div
                className="flex items-center text-xs font-bold uppercase tracking-widest gap-1.5"
                style={{ color: accent }}
              >
                View Flags{" "}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
              onClick={() => setShowCreate(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-4 bottom-4 md:inset-x-auto md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-[480px] bg-card border border-border rounded-[2rem] p-8 z-50 shadow-2xl max-h-[calc(100vh-5rem)] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">New Project</h3>
                <button
                  onClick={() => setShowCreate(false)}
                  className="p-2 rounded-xl hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Project Name *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Application"
                    autoFocus
                    className="w-full bg-background/60 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all"
                    style={{ "--tw-ring-color": accent } as React.CSSProperties}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Description</label>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                    className="w-full bg-background/60 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all"
                    style={{ "--tw-ring-color": accent } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Environments{" "}
                    <span className="text-muted-foreground font-normal">(comma-separated)</span>
                  </label>
                  <input
                    value={envInput}
                    onChange={(e) => setEnvInput(e.target.value)}
                    placeholder="development, staging, production"
                    className="w-full bg-background/60 border border-border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 transition-all"
                    style={{ "--tw-ring-color": accent } as React.CSSProperties}
                  />
                </div>
                <button
                  onClick={handleCreate}
                  disabled={!name.trim() || saving}
                  className="w-full py-3 rounded-xl font-bold transition-all hover:opacity-90 disabled:opacity-40 mt-2"
                  style={{ background: accent, color: "#fff" }}
                >
                  {saving ? "Creating…" : "Create Project"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
              onClick={() => setDeleteId(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-4 bottom-4 md:inset-x-auto md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-[400px] bg-card border border-border rounded-[2rem] p-8 z-50 shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-2">Delete Project?</h3>
              <p className="text-muted-foreground text-sm mb-6">
                This permanently deletes all flags and impressions. Cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => { await deleteProject(deleteId); setDeleteId(null); }}
                  className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm hover:opacity-90 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
