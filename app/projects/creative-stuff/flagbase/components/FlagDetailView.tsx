"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Play, BarChart2, CheckCircle, XCircle, ToggleLeft } from "lucide-react";
import { updateEnvConfig, recordImpression, subscribeToImpressions } from "../lib/firebase-ops";
import { evaluate } from "../lib/evaluator";
import type { FlagbaseProject, FlagbaseFlag, EnvConfig, FlagImpression, StrategyType } from "../lib/types";

interface Props {
  project: FlagbaseProject;
  flag: FlagbaseFlag;
  accent: string;
  accentGlow: string;
}

export default function FlagDetailView({ project, flag, accent, accentGlow }: Props) {
  const [activeEnv, setActiveEnv] = useState(project.environments[0] ?? "");
  const [impressions, setImpressions] = useState<Record<string, FlagImpression>>({});
  const [testUserId, setTestUserId] = useState("");
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const unsub = subscribeToImpressions(project.id, flag.id, setImpressions);
    return unsub;
  }, [project.id, flag.id]);

  // Reset test result when switching environments
  useEffect(() => { setTestResult(null); }, [activeEnv]);

  const envConfig: EnvConfig = flag.environments?.[activeEnv] ?? {
    enabled: false,
    strategy: "default",
    rolloutPercentage: 50,
    allowedUsers: "",
  };

  const handleConfig = async (changes: Partial<EnvConfig>) => {
    await updateEnvConfig(project.id, flag.id, activeEnv, changes);
  };

  const handleTest = async () => {
    setTesting(true);
    const result = evaluate(flag.environments?.[activeEnv], {
      userId: testUserId || undefined,
    });
    setTestResult(result);
    await recordImpression(project.id, flag.id, activeEnv);
    setTesting(false);
  };

  const chartData = project.environments.map((env) => ({
    env,
    count: impressions[env]?.count ?? 0,
  }));

  const totalEvals = chartData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      {/* Flag header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 rounded-2xl" style={{ background: accentGlow }}>
          <ToggleLeft className="w-6 h-6" style={{ color: accent }} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{flag.name}</h2>
          <code className="text-sm text-muted-foreground font-mono">{flag.key}</code>
          {flag.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{flag.description}</p>
          )}
        </div>
      </div>

      {/* Environment tabs */}
      <div className="flex gap-1 border-b border-border">
        {project.environments.map((env) => {
          const enabled = flag.environments?.[env]?.enabled ?? false;
          return (
            <button
              key={env}
              onClick={() => setActiveEnv(env)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all capitalize"
              style={{
                borderColor: activeEnv === env ? accent : "transparent",
                color: activeEnv === env ? accent : undefined,
              }}
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                  enabled ? "bg-green-500" : "bg-muted-foreground/40"
                }`}
              />
              {env}
            </button>
          );
        })}
      </div>

      {/* Config panel */}
      <motion.div
        key={activeEnv}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-[2rem] border border-border bg-card/40 backdrop-blur-xl space-y-6"
      >
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold capitalize">
              {activeEnv}{" "}
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ml-1 ${
                  envConfig.enabled
                    ? "bg-green-500/15 text-green-500"
                    : "bg-muted/60 text-muted-foreground"
                }`}
              >
                {envConfig.enabled ? "ON" : "OFF"}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">Master switch for this environment</p>
          </div>
          <button
            onClick={() => handleConfig({ enabled: !envConfig.enabled })}
            className={`w-12 h-7 rounded-full transition-all duration-300 relative flex-shrink-0 ${
              envConfig.enabled ? "bg-green-500" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-1.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${
                envConfig.enabled ? "left-7" : "left-1.5"
              }`}
            />
          </button>
        </div>

        <div className="h-px bg-border" />

        {/* Strategy selector */}
        <div>
          <p className="font-semibold mb-3 text-sm">Targeting Strategy</p>
          <div className="flex flex-wrap gap-2">
            {(["default", "rollout", "userlist"] as StrategyType[]).map((s) => (
              <button
                key={s}
                onClick={() => handleConfig({ strategy: s })}
                className="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                style={
                  envConfig.strategy === s
                    ? { background: accentGlow, color: accent, borderColor: accent }
                    : { borderColor: "transparent" }
                }
              >
                {s === "default" ? "Default (on/off)" : s === "rollout" ? "Gradual Rollout" : "User Allowlist"}
              </button>
            ))}
          </div>
        </div>

        {/* Rollout slider */}
        {envConfig.strategy === "rollout" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Rollout Percentage</p>
              <span className="text-2xl font-bold tabular-nums" style={{ color: accent }}>
                {envConfig.rolloutPercentage}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={envConfig.rolloutPercentage}
              onChange={(e) => handleConfig({ rolloutPercentage: +e.target.value })}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: accent }}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
              <span>0% (nobody)</span>
              <span>100% (everyone)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Users are bucketed deterministically by user ID — the same user always gets the same result.
            </p>
          </motion.div>
        )}

        {/* User allowlist */}
        {envConfig.strategy === "userlist" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <label className="block text-sm font-medium mb-2">
              Allowed User IDs{" "}
              <span className="text-muted-foreground font-normal">(comma-separated)</span>
            </label>
            <textarea
              value={envConfig.allowedUsers}
              onChange={(e) => handleConfig({ allowedUsers: e.target.value })}
              placeholder="user-123, user-456, beta@example.com"
              rows={3}
              className="w-full bg-background/60 border border-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-1 resize-none transition-all"
              style={{ "--tw-ring-color": accent } as React.CSSProperties}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {envConfig.allowedUsers
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean).length}{" "}
              user{envConfig.allowedUsers.split(",").filter((s) => s.trim()).length !== 1 ? "s" : ""} listed
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Live Test */}
      <div className="p-6 rounded-[2rem] border border-border bg-card/40 backdrop-blur-xl">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-sm">
          <Play className="w-4 h-4" style={{ color: accent }} />
          Live Evaluation Test
        </h3>
        <div className="flex gap-3">
          <input
            value={testUserId}
            onChange={(e) => setTestUserId(e.target.value)}
            placeholder="Enter User ID (optional)"
            className="flex-1 bg-background/60 border border-border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 transition-all"
            style={{ "--tw-ring-color": accent } as React.CSSProperties}
            onKeyDown={(e) => e.key === "Enter" && handleTest()}
          />
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex-shrink-0"
            style={{ background: accent, color: "#fff" }}
          >
            {testing ? "…" : "Evaluate"}
          </button>
        </div>

        <AnimatedResult result={testResult} userId={testUserId} env={activeEnv} />
      </div>

      {/* Impressions chart */}
      <div className="p-6 rounded-[2rem] border border-border bg-card/40 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <BarChart2 className="w-4 h-4" style={{ color: accent }} />
            Total Evaluations
          </h3>
          <span className="text-2xl font-bold tabular-nums">{totalEvals.toLocaleString()}</span>
        </div>

        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} barSize={28}>
            <XAxis
              dataKey="env"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={32}
            />
            <Tooltip
              formatter={(val) => [`${Number(val).toLocaleString()} evals`]}
              contentStyle={{ borderRadius: "0.75rem", border: "1px solid var(--border)" }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={accent} fillOpacity={0.75} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="flex flex-wrap gap-x-8 gap-y-3 mt-4 pt-4 border-t border-border">
          {project.environments.map((env) => (
            <div key={env}>
              <p className="text-xs text-muted-foreground capitalize">{env}</p>
              <p className="font-bold text-xl tabular-nums">
                {(impressions[env]?.count ?? 0).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnimatedResult({
  result,
  userId,
  env,
}: {
  result: boolean | null;
  userId: string;
  env: string;
}) {
  if (result === null) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 flex items-center gap-3 p-4 rounded-xl border"
      style={{
        borderColor: result ? "#22c55e" : "#ef4444",
        background: result ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
      }}
    >
      {result ? (
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      )}
      <span className="text-sm">
        Flag is{" "}
        <strong className={result ? "text-green-500" : "text-red-500"}>
          {result ? "ENABLED" : "DISABLED"}
        </strong>{" "}
        for{" "}
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {userId || "anonymous"}
        </code>{" "}
        in <span className="capitalize font-medium">{env}</span>
      </span>
    </motion.div>
  );
}
