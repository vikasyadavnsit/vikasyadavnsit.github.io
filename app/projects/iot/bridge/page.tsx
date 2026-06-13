"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Cpu, Zap, Bell, Lightbulb, Globe,
  Settings, Plus, Trash2, Power, History,
  Play, Pause, Sliders, Info, ShieldCheck, Activity, Thermometer
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeContext";
import { IoTApplet, IoTLog, subscribeToApplets, subscribeToLogs, deleteApplet, saveApplet, evaluateApplet } from "./lib/iot-logic";
import AppletEditor from "./components/AppletEditor";
import "./themes.css";

export default function IoTBridgePage() {
  const { mode: globalMode } = useTheme();
  const [applets, setApplets] = useState<IoTApplet[]>([]);
  const [logs, setLogs] = useState<IoTLog[]>([]);
  const [simLogs, setSimLogs] = useState<IoTLog[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingApplet, setEditingApplet] = useState<IoTApplet | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);

  // Throttle local triggers
  const lastLocalRun = useRef<Record<string, number>>({});

  // Simulation State
  const [temp, setTemp] = useState(24);
  const [humidity, setHumidity] = useState(45);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);

  // Load Data
  useEffect(() => {
    const unsubApplets = subscribeToApplets(setApplets);
    const unsubLogs = subscribeToLogs(setLogs);
    return () => {
      unsubApplets();
      unsubLogs();
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    };
  }, []);

  // Simulation Logic
  useEffect(() => {
    if (isSimulationRunning && !isLiveMode) {
      simulationInterval.current = setInterval(() => {
        // Randomly drift values
        setTemp(t => {
            const next = t + (Math.random() - 0.5) * 2;
            return parseFloat(next.toFixed(1));
        });
        setHumidity(h => {
            const next = h + (Math.random() - 0.5) * 5;
            return Math.min(100, Math.max(0, parseFloat(next.toFixed(1))));
        });
      }, 3000);
    } else if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
    }
    return () => {
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    };
  }, [isSimulationRunning]);

  // Evaluate Rules on sensor change
  useEffect(() => {
    const sensorData = { temp, humidity };
    applets.forEach(async (applet) => {
        if (applet.enabled) {
            // Local check for simulation to avoid re-triggering every frame
            if (!isLiveMode) {
                const last = lastLocalRun.current[applet.id] || 0;
                if (Date.now() - last < 10000) return;
            }

            const result = await evaluateApplet(applet, sensorData, isLiveMode);
            if (result && !isLiveMode) {
                lastLocalRun.current[applet.id] = Date.now();
                setSimLogs(prev => [{ ...result, id: `sim_${Date.now()}` }, ...prev].slice(0, 20));
            }
        }
    });
  }, [temp, humidity, applets, isLiveMode]);

  const handleManualTrigger = async (applet: IoTApplet) => {
    const result = await evaluateApplet(applet, { temp, humidity }, true); // Manual always persists
    if (result && !isLiveMode) {
        setSimLogs(prev => [{ ...result, id: `sim_${Date.now()}` }, ...prev].slice(0, 20));
    }
  };

  const toggleApplet = async (applet: IoTApplet) => {
    await saveApplet({ ...applet, enabled: !applet.enabled });
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'notification': return Bell;
      case 'light': return Lightbulb;
      case 'fetch': return Globe;
      case 'sensor': return Cpu;
      default: return Zap;
    }
  };

  return (
    <main className={cn(
      "min-h-screen font-sans text-foreground transition-colors duration-700",
      globalMode === 'dark' ? "iot-theme-dark bg-[#0a0a0c]" : "iot-theme-light bg-slate-50"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-20">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-14">
          <Link
            href="/projects/iot"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 group text-sm"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to IOT Solutions
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20">
                <Cpu className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter">
                  IoT <span className="text-muted-foreground">Bridge</span>
                </h1>
                <p className="text-muted-foreground mt-2 text-sm sm:text-base flex items-center gap-2">
                  Personal automation hub. <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">Powered by Firebase</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
               {/* Mode Toggle */}
              <div className="flex items-center gap-2 p-1.5 bg-muted rounded-2xl border border-border">
                <button
                  onClick={() => setIsLiveMode(false)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    !isLiveMode ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Simulate
                </button>
                <button
                  onClick={() => setIsLiveMode(true)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    isLiveMode ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Live
                </button>
              </div>

              <button
                onClick={() => { setEditingApplet(null); setIsEditorOpen(true); }}
                className="flex items-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl shadow-primary/20"
              >
                <Plus className="w-4 h-4" />
                New Applet
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Content: Applets */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Active Applets
              </h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{applets.length} Rules Defined</span>
            </div>

            {applets.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-border rounded-[2.5rem]">
                    <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <p className="text-muted-foreground">No applets created yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                    {applets.map((applet) => {
                        const ActionIcon = getIcon(applet.action.type);
                        const TriggerIcon = getIcon(applet.trigger.type);
                        return (
                        <motion.div
                            key={applet.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={cn(
                                "group p-6 rounded-[2.5rem] border transition-all duration-500",
                                applet.enabled ? "bg-card/40 border-border hover:border-primary/20 shadow-lg" : "bg-muted/10 border-transparent opacity-60"
                            )}
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className={cn(
                                    "p-3 rounded-2xl transition-colors",
                                    applet.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                    <TriggerIcon className="w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleManualTrigger(applet)}
                                        className="p-2.5 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                                        title="Test Applet (Writes to Firebase)"
                                    >
                                        <Play className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => { setEditingApplet(applet); setIsEditorOpen(true); }}
                                        className="p-2.5 rounded-xl hover:bg-muted transition-colors"
                                    >
                                        <Settings className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                    <button
                                        onClick={() => deleteApplet(applet.id)}
                                        className="p-2.5 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold mb-1 truncate">{applet.name}</h3>
                            <div className="flex items-center gap-2 text-muted-foreground mb-6">
                                <span className="text-[10px] font-black uppercase tracking-widest">If {applet.trigger.type}</span>
                                <div className="h-px flex-1 bg-border" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Then {applet.action.type}</span>
                            </div>

                            <div className="flex items-center justify-between gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Status</span>
                                    <span className="text-xs font-bold">{applet.enabled ? "Running" : "Paused"}</span>
                                </div>
                                <button
                                    onClick={() => toggleApplet(applet)}
                                    className={cn(
                                        "w-12 h-6 rounded-full transition-all relative",
                                        applet.enabled ? "bg-primary" : "bg-muted"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                        applet.enabled ? "left-7" : "left-1"
                                    )} />
                                </button>
                            </div>
                        </motion.div>
                        );
                    })}
                </AnimatePresence>
                </div>
            )}
          </div>

          {/* Sidebar: Simulation & Logs */}
          <div className="space-y-8">

            {/* Simulation Panel */}
            <div className={cn(
                "p-8 rounded-[2.5rem] bg-card border border-border shadow-xl transition-all duration-500",
                isLiveMode && "opacity-50 pointer-events-none grayscale-[0.5]"
            )}>
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-primary" />
                        Simulation
                    </h2>
                    <button
                        onClick={() => !isLiveMode && setIsSimulationRunning(!isSimulationRunning)}
                        disabled={isLiveMode}
                        className={cn(
                            "p-2.5 rounded-xl transition-all",
                            isSimulationRunning ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500",
                            isLiveMode && "cursor-not-allowed"
                        )}
                    >
                        {isSimulationRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                </div>

                <div className="space-y-6">
                    {isLiveMode ? (
                        <div className="py-10 text-center space-y-3">
                            <Activity className="w-8 h-8 mx-auto text-muted-foreground opacity-20 animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No Live Data Currently</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    <span className="flex items-center gap-2"><Thermometer className="w-3.5 h-3.5" /> Temperature</span>
                                    <span className="text-foreground">{temp}°C</span>
                                </div>
                                <input
                                    type="range" min="0" max="50" step="0.1"
                                    value={temp} onChange={(e) => setTemp(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-muted rounded-full appearance-none accent-primary cursor-pointer"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    <span className="flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Humidity</span>
                                    <span className="text-foreground">{humidity}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="100" step="1"
                                    value={humidity} onChange={(e) => setHumidity(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-muted rounded-full appearance-none accent-primary cursor-pointer"
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="mt-10 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="flex gap-3">
                        <Info className="w-4 h-4 text-primary shrink-0" />
                        <p className="text-[10px] leading-relaxed text-muted-foreground">
                            {isLiveMode
                                ? "Live mode is active. System is waiting for real external events or Webhooks."
                                : "Simulation mode triggers applets based on these virtual sensors. Use Live mode for real external events."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Logs Panel */}
            <div className="flex flex-col h-[500px] p-8 rounded-[2.5rem] bg-card/40 border border-border backdrop-blur-xl">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        Activity Log
                    </h2>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                    {/* Simulation Logs (Ephemeral) */}
                    {!isLiveMode && simLogs.length > 0 && (
                        <div className="space-y-4 mb-8">
                             <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/60">
                                <div className="h-px flex-1 bg-primary/20" />
                                Simulation Logs (Local)
                                <div className="h-px flex-1 bg-primary/20" />
                             </div>
                             {simLogs.map((log) => (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-xs"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-primary">{log.appletName}</span>
                                        <span className="text-[9px] opacity-40">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-muted-foreground">{log.message}</p>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Persistent Logs */}
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-4">
                        <div className="h-px flex-1 bg-border" />
                        {isLiveMode ? "Live Logs (Firebase)" : "Saved History (Firebase)"}
                        <div className="h-px flex-1 bg-border" />
                    </div>

                    {logs.length === 0 && simLogs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20">
                            <History className="w-8 h-8 mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">No activity yet</p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {logs.map((log) => (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-4 rounded-2xl bg-muted/30 border border-border/50 text-xs"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-primary">{log.appletName}</span>
                                        <span className="text-[9px] opacity-40">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-muted-foreground">{log.message}</p>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>

          </div>
        </div>
      </div>

      <AppletEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        applet={editingApplet}
      />

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </main>
  );
}
