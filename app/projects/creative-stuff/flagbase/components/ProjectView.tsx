"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Flag, Trash2, X, Code2, ToggleLeft, Copy, Check } from "lucide-react";
import { createFlag, deleteFlag, updateEnvConfig } from "../lib/firebase-ops";
import { toSlug } from "../lib/evaluator";
import type { FlagbaseProject, FlagbaseFlag, EnvConfig } from "../lib/types";

interface Props {
  project: FlagbaseProject;
  flags: FlagbaseFlag[];
  onSelectFlag: (flagId: string) => void;
  accent: string;
  accentGlow: string;
}

export default function ProjectView({ project, flags, onSelectFlag, accent, accentGlow }: Props) {
  const [tab, setTab] = useState<"flags" | "sdk">("flags");
  const [showCreate, setShowCreate] = useState(false);
  const [flagName, setFlagName] = useState("");
  const [flagKey, setFlagKey] = useState("");
  const [flagDesc, setFlagDesc] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setFlagName(val);
    if (!keyEdited) setFlagKey(toSlug(val));
  };

  const handleCreate = async () => {
    if (!flagName.trim() || !flagKey.trim()) return;
    setSaving(true);
    const envs: Record<string, EnvConfig> = {};
    project.environments.forEach((env) => {
      envs[env] = { enabled: false, strategy: "default", rolloutPercentage: 50, allowedUsers: "" };
    });
    await createFlag(project.id, {
      name: flagName.trim(),
      key: flagKey.trim(),
      description: flagDesc.trim(),
      type: "boolean",
      createdAt: Date.now(),
      environments: envs,
    });
    setFlagName(""); setFlagKey(""); setFlagDesc(""); setKeyEdited(false);
    setSaving(false);
    setShowCreate(false);
  };

  const handleToggle = async (flag: FlagbaseFlag, env: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = flag.environments?.[env]?.enabled ?? false;
    await updateEnvConfig(project.id, flag.id, env, { enabled: !current });
  };

  const envCols = project.environments.map(() => "72px").join(" ");

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-10 border-b border-border">
        {(["flags", "sdk"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all"
            style={{
              borderColor: tab === t ? accent : "transparent",
              color: tab === t ? accent : undefined,
            }}
          >
            {t === "flags" ? <ToggleLeft className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
            {t === "flags" ? "Feature Flags" : "SDK & Docs"}
          </button>
        ))}
      </div>

      {tab === "sdk" ? (
        <SdkPanel project={project} accent={accent} accentGlow={accentGlow} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground text-sm">
              {flags.length} flag{flags.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all hover:scale-105 active:scale-95"
              style={{ background: accent, color: "#fff" }}
            >
              <Plus className="w-4 h-4" /> New Flag
            </button>
          </div>

          {flags.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-border rounded-[2rem]">
              <Flag className="w-10 h-10 mx-auto mb-4 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No flags yet. Create your first feature flag.</p>
            </div>
          ) : (
            <div className="border border-border rounded-[1.5rem] overflow-hidden">
              {/* Header row */}
              <div
                className="grid px-6 py-3 bg-muted/30 text-xs font-semibold uppercase tracking-widest text-muted-foreground border-b border-border"
                style={{ gridTemplateColumns: `1fr 140px ${envCols} 40px` }}
              >
                <span>Flag</span>
                <span className="text-center">Key</span>
                {project.environments.map((env) => (
                  <span key={env} className="text-center truncate capitalize">
                    {env}
                  </span>
                ))}
                <span />
              </div>

              {flags.map((flag, i) => (
                <motion.div
                  key={flag.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="grid items-center px-6 py-4 border-b border-border last:border-0 hover:bg-muted/10 transition-colors group cursor-pointer"
                  style={{ gridTemplateColumns: `1fr 140px ${envCols} 40px` }}
                  onClick={() => onSelectFlag(flag.id)}
                >
                  <div>
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                      {flag.name}
                    </p>
                    {flag.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                        {flag.description}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-muted/40 border border-border truncate max-w-[130px]">
                      {flag.key}
                    </span>
                  </div>

                  {project.environments.map((env) => {
                    const enabled = flag.environments?.[env]?.enabled ?? false;
                    return (
                      <div key={env} className="flex justify-center">
                        <button
                          onClick={(e) => handleToggle(flag, env, e)}
                          className={`w-10 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${
                            enabled ? "bg-green-500" : "bg-muted"
                          }`}
                          title={`${enabled ? "Disable" : "Enable"} in ${env}`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${
                              enabled ? "left-5" : "left-1"
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}

                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteId(flag.id); }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Flag Modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                <h3 className="text-xl font-bold">New Feature Flag</h3>
                <button onClick={() => setShowCreate(false)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Flag Name *</label>
                  <input
                    value={flagName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Dark Mode"
                    autoFocus
                    className="w-full bg-background/60 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all"
                    style={{ "--tw-ring-color": accent } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Key <span className="text-muted-foreground font-normal">(used in SDK)</span> *</label>
                  <input
                    value={flagKey}
                    onChange={(e) => { setFlagKey(e.target.value); setKeyEdited(true); }}
                    placeholder="dark-mode"
                    className="w-full bg-background/60 border border-border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 transition-all"
                    style={{ "--tw-ring-color": accent } as React.CSSProperties}
                  />
                  <p className="text-xs text-muted-foreground mt-1">lowercase letters, numbers, hyphens only</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Description</label>
                  <input
                    value={flagDesc}
                    onChange={(e) => setFlagDesc(e.target.value)}
                    placeholder="Optional description"
                    className="w-full bg-background/60 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all"
                    style={{ "--tw-ring-color": accent } as React.CSSProperties}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground mb-3">
                    Flag will be created as <strong>disabled</strong> in all environments:&nbsp;
                    {project.environments.join(", ")}
                  </p>
                  <button
                    onClick={handleCreate}
                    disabled={!flagName.trim() || !flagKey.trim() || saving}
                    className="w-full py-3 rounded-xl font-bold transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: accent, color: "#fff" }}
                  >
                    {saving ? "Creating…" : "Create Flag"}
                  </button>
                </div>
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
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
              <h3 className="text-xl font-bold mb-2">Delete Flag?</h3>
              <p className="text-muted-foreground text-sm mb-6">
                This permanently deletes this flag and all impression data. Cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button
                  onClick={async () => { await deleteFlag(project.id, deleteId); setDeleteId(null); }}
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

// ── SDK Panel ─────────────────────────────────────────────────────────────

function SdkPanel({
  project,
  accent,
  accentGlow,
}: {
  project: FlagbaseProject;
  accent: string;
  accentGlow: string;
}) {
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedUsage, setCopiedUsage] = useState(false);

  const sdkClass = `class Flagbase {
  constructor({ projectId, environment, userId }) {
    this.projectId = projectId;
    this.env = environment;
    this.userId = userId || null;
    this.flags = {};
    this._ready = this._load();
  }
  async _load() {
    const url =
      \`https://portfolio-projects-773a3-default-rtdb.firebaseio.com\` +
      \`/flagbase/flags/\${this.projectId}.json\`;
    this.flags = (await fetch(url).then(r => r.json())) ?? {};
  }
  async isEnabled(key, ctx = {}) {
    await this._ready;
    const flag = Object.values(this.flags).find(f => f.key === key);
    const env  = flag?.environments?.[this.env];
    if (!env?.enabled) return false;
    if (env.strategy === "rollout") {
      return this._hash((ctx.userId ?? this.userId) || "anon") % 100
        < (env.rolloutPercentage ?? 50);
    }
    if (env.strategy === "userlist") {
      const list = (env.allowedUsers || "").split(",").map(s => s.trim()).filter(Boolean);
      return list.includes((ctx.userId ?? this.userId) || "");
    }
    return true;
  }
  _hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++)
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
}`;

  const usageSnippet = `const client = new Flagbase({
  projectId:   "${project.id}",
  environment: "production",   // ${project.environments.map((e) => `"${e}"`).join(" | ")}
  userId:      "user-123",     // optional default
});

// Simple boolean check
const isDarkMode = await client.isEnabled("dark-mode");

// Override user per call
const showBeta = await client.isEnabled("beta-ui", { userId: "power-user" });`;

  const copyText = async (text: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="text-sm text-muted-foreground mb-1">Project ID</p>
        <code
          className="inline-block px-3 py-2 rounded-xl text-sm font-mono border border-border bg-muted/40"
        >
          {project.id}
        </code>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">1. Paste the SDK</h3>
          <button
            onClick={() => copyText(sdkClass, setCopiedSnippet)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: accentGlow, color: accent }}
          >
            {copiedSnippet ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedSnippet ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="p-5 rounded-[1.5rem] border border-border bg-muted/20 text-xs font-mono overflow-x-auto leading-relaxed">
          <code>{sdkClass}</code>
        </pre>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">2. Use in your app</h3>
          <button
            onClick={() => copyText(usageSnippet, setCopiedUsage)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: accentGlow, color: accent }}
          >
            {copiedUsage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedUsage ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="p-5 rounded-[1.5rem] border border-border bg-muted/20 text-xs font-mono overflow-x-auto leading-relaxed">
          <code>{usageSnippet}</code>
        </pre>
      </div>

      <div
        className="p-5 rounded-[1.5rem] border text-sm"
        style={{ borderColor: accent, background: accentGlow }}
      >
        <strong style={{ color: accent }}>Note:</strong>{" "}
        <span className="text-muted-foreground">
          Flagbase reads your flag configuration from Firebase Realtime DB — no auth required for
          reads. Flag evaluation runs entirely client-side. The SDK is ~30 lines with zero
          dependencies.
        </span>
      </div>
    </div>
  );
}
