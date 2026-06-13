"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Cpu, Zap, Bell, Lightbulb, Globe, X,
  Settings, Plus, Trash2, History,
  Play, Pause, Sliders, Info, Activity, Thermometer,
  Droplets, Wind, Gauge, RotateCcw, ArrowRight, Clock, Copy,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeContext";
import {
  IoTApplet, IoTLog, SensorData,
  SENSOR_FIELDS, SENSOR_OPS,
  subscribeToApplets, subscribeToLogs, deleteApplet, saveApplet,
  evaluateApplet, checkSensorCondition, executeAction,
  clearWebhookTrigger,
} from "./lib/iot-logic";
import AppletEditor from "./components/AppletEditor";
import "./themes.css";

// ─── pure helpers ────────────────────────────────────────────────────────────

function formatTriggerText(applet: IoTApplet): string {
  if (applet.trigger.type === "time")    return `At ${applet.trigger.value}`;
  if (applet.trigger.type === "webhook") return `Webhook: ${applet.trigger.value.slice(0, 20)}`;
  const parts = applet.trigger.value.split(" ");
  if (parts.length < 3) return applet.trigger.value;
  const [field, op, val] = parts;
  const fm = SENSOR_FIELDS.find(f => f.id === field);
  const om = SENSOR_OPS.find(o => o.id === op);
  return `${fm?.label ?? field} ${om?.label ?? op} ${val}${fm?.unit ?? ""}`;
}

function formatActionText(applet: IoTApplet): string {
  if (applet.action.type === "light") {
    const dev = applet.action.target || "Main Light";
    return `${dev}: ${applet.action.value.toUpperCase()}`;
  }
  if (applet.action.type === "notification")
    return `Notify: "${applet.action.value.slice(0, 28)}${applet.action.value.length > 28 ? "…" : ""}"`;
  if (applet.action.type === "fetch") {
    try { return `${applet.action.fetchMethod ?? "POST"} → ${new URL(applet.action.value).hostname}`; }
    catch { return applet.action.value.slice(0, 30); }
  }
  return applet.action.value;
}

function formatRelativeTime(ts?: number): string {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  if (diff < 60000)   return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  sensor: Thermometer, time: Clock, webhook: Globe,
};
const ACTION_ICONS: Record<string, React.ElementType> = {
  notification: Bell, light: Lightbulb, fetch: Globe,
};
const ACTION_COLORS: Record<string, string> = {
  notification: "from-primary/30 to-primary/10",
  light:        "from-yellow-400/30 to-amber-400/10",
  fetch:        "from-emerald-400/30 to-teal-400/10",
};
const LOG_STATUS_CLASSES: Record<string, string> = {
  success:      "bg-emerald-500/10 border-emerald-500/20",
  failure:      "bg-red-500/10 border-red-500/20",
  "auto-reset": "bg-amber-500/10 border-amber-500/20",
};
const LOG_NAME_CLASSES: Record<string, string> = {
  success:      "text-emerald-400",
  failure:      "text-red-400",
  "auto-reset": "text-amber-400",
};

// ─── page ────────────────────────────────────────────────────────────────────

export default function IoTBridgePage() {
  const { mode: globalMode } = useTheme();

  // Data
  const [applets, setApplets] = useState<IoTApplet[]>([]);
  const [logs, setLogs]       = useState<IoTLog[]>([]);
  const [simLogs, setSimLogs] = useState<IoTLog[]>([]);

  // Keep a ref in sync so webhook callback never reads stale applets
  const appletsRef = useRef<IoTApplet[]>([]);

  // UI
  const [isEditorOpen, setIsEditorOpen]   = useState(false);
  const [editingApplet, setEditingApplet] = useState<IoTApplet | null>(null);
  const [isLiveMode, setIsLiveMode]       = useState(false);

  // Throttle / dedup
  const lastLocalRun      = useRef<Record<string, number>>({});
  const processedWebhooks = useRef<Record<string, number>>({});

  // Sensors
  const [temp, setTemp]         = useState(24);
  const [humidity, setHumidity] = useState(45);
  const [pressure, setPressure] = useState(1013.3);
  const [co2, setCo2]           = useState(600);
  const [motionVal, setMotionVal] = useState(0);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);

  const sensorData = useMemo<SensorData>(
    () => ({ temp, humidity, pressure, co2, motion: motionVal }),
    [temp, humidity, pressure, co2, motionVal]
  );
  const sensorDataRef = useRef<SensorData>(sensorData);
  useEffect(() => { sensorDataRef.current = sensorData; }, [sensorData]);

  // Action feedback — named virtual devices
  const [virtualDevices, setVirtualDevices]         = useState<Record<string, boolean>>({});
  const [deviceControlledBy, setDeviceControlledBy] = useState<Record<string, string>>({});
  const [fetchResponses, setFetchResponses]          = useState<Record<string, { status: number; body: string; ts: number }>>({});
  const [toasts, setToasts]                         = useState<{ id: string; message: string; appletName: string; actionType: string }[]>([]);

  // Derive unique light device names from current applets
  const lightDevices = useMemo(() => {
    const seen = new Set<string>();
    applets.forEach(a => {
      if (a.action.type === "light") seen.add(a.action.target || "Main Light");
    });
    if (seen.size === 0) seen.add("Main Light");
    return Array.from(seen);
  }, [applets]);

  // Applet active state (for IFTTT green dot + hysteresis)
  const [appletActiveStates, setAppletActiveStates] = useState<Record<string, boolean>>({});
  const appletActiveStatesRef = useRef<Record<string, boolean>>({});
  useEffect(() => { appletActiveStatesRef.current = appletActiveStates; }, [appletActiveStates]);

  // ── helpers ──

  const addToast = (appletName: string, message: string, actionType: string) => {
    const id = `t_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev.slice(-4), { id, message, appletName, actionType }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  };

  const handleActionEffect = (
    applet: IoTApplet,
    isAutoReset = false,
    fetchResponse?: { status: number; body: string }
  ) => {
    if (applet.action.type === "light") {
      const deviceName = applet.action.target || "Main Light";
      const isOn       = applet.action.value.toLowerCase() === "on";
      setVirtualDevices(prev => ({ ...prev, [deviceName]: isOn }));
      setDeviceControlledBy(prev => ({
        ...prev,
        [deviceName]: isAutoReset ? `Auto-reset (${applet.name})` : applet.name,
      }));
    } else if (applet.action.type === "notification") {
      const sd = sensorDataRef.current;
      const message = applet.action.value
        .replace(/{temp}/g,     String(sd.temp))
        .replace(/{humidity}/g, String(sd.humidity))
        .replace(/{pressure}/g, String(sd.pressure))
        .replace(/{co2}/g,      String(sd.co2))
        .replace(/{motion}/g,   sd.motion === 1 ? "Detected" : "None");
      addToast(applet.name, message, "notification");
    } else if (applet.action.type === "fetch") {
      if (fetchResponse) {
        setFetchResponses(prev => ({
          ...prev,
          [applet.id]: { ...fetchResponse, ts: Date.now() },
        }));
      }
      addToast(
        applet.name,
        fetchResponse ? `${fetchResponse.status} · ${fetchResponse.body.slice(0, 60)}` : `Fired → ${applet.action.value}`,
        "fetch"
      );
    }
  };

  // ── load data + webhook subscription ──

  useEffect(() => {
    const unsubApplets = subscribeToApplets(a => {
      setApplets(a);
      appletsRef.current = a;
    });
    const unsubLogs = subscribeToLogs(setLogs);
    return () => {
      unsubApplets();
      unsubLogs();
      if (simulationInterval.current) clearInterval(simulationInterval.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── webhook trigger handler (watches applets for webhookTrigger field) ──
  useEffect(() => {
    applets.forEach(async (applet) => {
      if (!applet.webhookTrigger) return;
      if (!applet.enabled || applet.trigger.type !== "webhook") return;

      const { params, timestamp } = applet.webhookTrigger;

      // Prevent double-processing — subscription fires again after we clear the field
      if (processedWebhooks.current[applet.id] === timestamp) return;
      processedWebhooks.current[applet.id] = timestamp;

      // Clear from Firebase first so stale events don't re-fire on page reload
      await clearWebhookTrigger(applet.id);

      const result = await executeAction(applet, true);
      if (result) {
        const paramsStr = Object.keys(params).length
          ? `Webhook → ${JSON.stringify(params).slice(0, 60)} · `
          : "Webhook received · ";
        const enrichedLog = { ...result, id: `wh_${Date.now()}`, message: paramsStr + result.message };
        setSimLogs(prev => [enrichedLog, ...prev].slice(0, 20));
        handleActionEffect(applet, false, result.fetchResponse);
        addToast(
          applet.name,
          Object.keys(params).length ? `Received · ${JSON.stringify(params).slice(0, 50)}` : "Webhook received",
          "webhook"
        );
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applets]);

  // ── simulation drift ──

  useEffect(() => {
    if (isSimulationRunning && !isLiveMode) {
      simulationInterval.current = setInterval(() => {
        setTemp(t     => parseFloat(Math.min(50,   Math.max(0,   t + (Math.random() - 0.5) * 2)).toFixed(1)));
        setHumidity(h => parseFloat(Math.min(100,  Math.max(0,   h + (Math.random() - 0.5) * 5)).toFixed(1)));
        setPressure(p => parseFloat(Math.min(1050, Math.max(950, p + (Math.random() - 0.5) * 1)).toFixed(1)));
        setCo2(c      => parseFloat(Math.min(2000, Math.max(400, c + (Math.random() - 0.3) * 15)).toFixed(0)));
        if (Math.random() < 0.05) setMotionVal(mv => mv === 0 ? 1 : 0);
      }, 3000);
    } else if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
    }
    return () => { if (simulationInterval.current) clearInterval(simulationInterval.current); };
  }, [isSimulationRunning, isLiveMode]);

  // ── evaluate sensor rules (rising/falling edge with hysteresis) ──

  useEffect(() => {
    applets.forEach(async (applet) => {
      if (!applet.enabled || applet.trigger.type !== "sensor") return;

      const isActive  = checkSensorCondition(applet, sensorData);
      const wasActive = appletActiveStatesRef.current[applet.id] ?? false;

      if (isActive !== wasActive) {
        setAppletActiveStates(prev => ({ ...prev, [applet.id]: isActive }));
      }

      // Rising edge → fire action (debounced)
      if (isActive && !wasActive) {
        const last = lastLocalRun.current[applet.id] ?? 0;
        if (Date.now() - last < 10000) return;
        lastLocalRun.current[applet.id] = Date.now();
        const result = await executeAction(applet, isLiveMode);
        if (result) {
          if (!isLiveMode) setSimLogs(prev => [{ ...result, id: `sim_${Date.now()}` }, ...prev].slice(0, 20));
          handleActionEffect(applet, false, result.fetchResponse);
        }
      }

      // Falling edge → auto-reset light
      if (!isActive && wasActive && applet.action.type === "light") {
        const inverse     = applet.action.value.toLowerCase() === "on" ? "off" : "on";
        const resetApplet = { ...applet, action: { ...applet.action, value: inverse } };
        const result      = await executeAction(resetApplet, isLiveMode);
        if (result) {
          const resetLog = {
            ...result,
            status:  "auto-reset" as const,
            message: `Auto-reset: Light → ${inverse.toUpperCase()} (condition cleared)`,
          };
          if (!isLiveMode) setSimLogs(prev => [{ ...resetLog, id: `sim_r_${Date.now()}` }, ...prev].slice(0, 20));
          handleActionEffect(resetApplet, true);
          addToast(applet.name, `Condition cleared → Light auto-reset to ${inverse.toUpperCase()}`, "auto-reset");
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorData, applets]);

  const handleManualTrigger = async (applet: IoTApplet) => {
    const result = await executeAction(applet, true);
    if (result) {
      if (!isLiveMode) setSimLogs(prev => [{ ...result, id: `sim_${Date.now()}` }, ...prev].slice(0, 20));
      handleActionEffect(applet, false, result.fetchResponse);
    }
  };

  const toggleApplet = async (applet: IoTApplet) => {
    await saveApplet({ ...applet, enabled: !applet.enabled });
  };

  // ── JSX ──

  return (
    <main className={cn(
      "min-h-screen font-sans text-foreground transition-colors duration-700",
      globalMode === "dark" ? "iot-theme-dark bg-[#0a0a0c]" : "iot-theme-light bg-slate-50"
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
                  Personal automation hub.{" "}
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                    Powered by Firebase
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
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

          {/* ── Applets ── */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Active Applets
              </h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {applets.length} Rules Defined
              </span>
            </div>

            {applets.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-border rounded-[2.5rem]">
                <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground mb-2">No applets yet.</p>
                <p className="text-xs text-muted-foreground/60">Create an applet to automate your virtual devices.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {applets.map((applet) => {
                    const isSensor  = applet.trigger.type === "sensor";
                    const isActive  = isSensor && (appletActiveStates[applet.id] ?? false);
                    const TrigIcon  = TRIGGER_ICONS[applet.trigger.type] ?? Zap;
                    const ActIcon   = ACTION_ICONS[applet.action.type]   ?? Zap;
                    const fetchRes  = fetchResponses[applet.id];

                    return (
                      <motion.div
                        key={applet.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={cn(
                          "relative group p-6 rounded-[2.5rem] border transition-all duration-500",
                          applet.enabled
                            ? isActive
                              ? "bg-emerald-500/5 border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                              : "bg-card/40 border-border hover:border-primary/20 shadow-lg"
                            : "bg-muted/10 border-transparent opacity-60"
                        )}
                      >
                        {/* Active state dot: green=sensor active, blue=webhook listening, gray=idle */}
                        <div className={cn(
                          "absolute top-5 left-5 w-2.5 h-2.5 rounded-full transition-all duration-500",
                          isActive
                            ? "bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.5)] animate-pulse"
                            : applet.trigger.type === "webhook" && applet.enabled
                              ? "bg-blue-500 shadow-[0_0_6px_2px_rgba(59,130,246,0.4)] animate-pulse"
                              : "bg-muted"
                        )} />

                        {/* Action buttons */}
                        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleManualTrigger(applet)}
                            className="p-2 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                            title="Test — force-fires the action"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setEditingApplet(applet); setIsEditorOpen(true); }}
                            className="p-2 rounded-xl hover:bg-muted transition-colors"
                          >
                            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => deleteApplet(applet.id)}
                            className="p-2 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Icon pair */}
                        <div className="flex items-center gap-3 mt-2 mb-5">
                          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10">
                            <TrigIcon className="w-5 h-5 text-blue-400" />
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                          <div className={cn("p-3 rounded-2xl bg-gradient-to-br", ACTION_COLORS[applet.action.type] ?? "from-muted to-muted/50")}>
                            <ActIcon className={cn(
                              "w-5 h-5",
                              applet.action.type === "light" ? "text-yellow-400" :
                              applet.action.type === "fetch" ? "text-emerald-400" : "text-primary"
                            )} />
                          </div>
                        </div>

                        {/* Name */}
                        <h3 className="text-base font-bold mb-3 truncate pr-20">{applet.name}</h3>

                        {/* IF / THEN */}
                        <div className="space-y-1 mb-4">
                          <p className="text-xs text-muted-foreground">
                            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/50 mr-1.5">IF</span>
                            {formatTriggerText(applet)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/50 mr-1.5">THEN</span>
                            {formatActionText(applet)}
                          </p>
                        </div>

                        {/* Webhook curl chip */}
                        {applet.trigger.type === "webhook" && (
                          <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 mb-3 overflow-hidden">
                            <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                              <span className="text-[9px] font-black uppercase tracking-widest text-blue-400/70">
                                Fires: {formatActionText(applet)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  const ts = Date.now();
                                  navigator.clipboard.writeText(
`curl -X PUT \\
  "https://portfolio-projects-773a3-default-rtdb.firebaseio.com/iot_bridge/applets/${applet.id}/webhookTrigger.json" \\
  -H "Content-Type: application/json" \\
  -d '{"params":{"key":"value"},"timestamp":${ts}}'`
                                  );
                                }}
                                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-colors shrink-0 px-1.5 py-0.5 rounded-lg hover:bg-blue-500/10"
                                title="Copy full curl command"
                              >
                                <Copy className="w-2.5 h-2.5" /> Copy curl
                              </button>
                            </div>
                            <code className="block text-[9px] font-mono text-blue-400/60 px-3 pb-2.5 leading-relaxed break-all">
                              PUT …/applets/{applet.id.slice(0, 10)}…/webhookTrigger.json
                            </code>
                          </div>
                        )}

                        {/* Fetch response badge */}
                        {applet.action.type === "fetch" && fetchRes && (
                          <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-xl border mb-3 text-[9px] font-mono",
                            fetchRes.status >= 200 && fetchRes.status < 300
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-red-500/10 border-red-500/20 text-red-400"
                          )}>
                            <span className="font-black shrink-0">{fetchRes.status}</span>
                            <span className="text-muted-foreground truncate">{fetchRes.body.slice(0, 40)}</span>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                          <span className="text-[9px] text-muted-foreground/50 font-mono">
                            {formatRelativeTime(applet.lastRun)}
                          </span>
                          <button
                            onClick={() => toggleApplet(applet)}
                            className={cn(
                              "w-10 h-5 rounded-full transition-all relative shrink-0",
                              applet.enabled ? "bg-primary" : "bg-muted"
                            )}
                            title={applet.enabled ? "Disable" : "Enable"}
                          >
                            <div className={cn(
                              "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all",
                              applet.enabled ? "left-5" : "left-0.5"
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

          {/* ── Sidebar ── */}
          <div className="space-y-8">

            {/* Simulation Panel */}
            <div className={cn(
              "p-6 rounded-[2.5rem] bg-card border border-border shadow-xl transition-all duration-500",
              isLiveMode && "opacity-50 pointer-events-none grayscale-[0.5]"
            )}>
              <div className="flex items-center justify-between mb-6">
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

              {isLiveMode ? (
                <div className="py-10 text-center space-y-3">
                  <Activity className="w-8 h-8 mx-auto text-muted-foreground opacity-20 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No Live Data Currently</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <SensorSlider label="Temperature" value={temp}     unit="°C"  min={0}   max={50}   step={0.1} icon={<Thermometer className="w-3.5 h-3.5" />} onChange={setTemp} />
                  <SensorSlider label="Humidity"    value={humidity} unit="%"   min={0}   max={100}  step={1}   icon={<Droplets    className="w-3.5 h-3.5" />} onChange={setHumidity} />
                  <SensorSlider label="Pressure"    value={pressure} unit=" hPa" min={950} max={1050} step={0.5} icon={<Gauge       className="w-3.5 h-3.5" />} onChange={setPressure} displayValue={pressure.toFixed(1)} />
                  <SensorSlider label="CO₂"         value={co2}      unit=" ppm" min={400} max={2000} step={10}  icon={<Wind        className="w-3.5 h-3.5" />} onChange={setCo2} displayValue={Math.round(co2).toString()} />

                  {/* Motion toggle */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <span className="flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Motion</span>
                      <span className={cn("transition-colors", motionVal === 1 ? "text-emerald-400" : "text-foreground")}>
                        {motionVal === 1 ? "Detected" : "None"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {[{ v: 0, label: "No Motion" }, { v: 1, label: "Motion Detected" }].map((m) => (
                        <button key={m.v} onClick={() => setMotionVal(m.v)}
                          className={cn(
                            "flex-1 py-2 rounded-2xl border text-[10px] font-bold transition-all",
                            motionVal === m.v
                              ? m.v === 1
                                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                                : "bg-muted/60 border-border text-foreground"
                              : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
                          )}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Virtual Devices — dynamic per named device */}
                  <div className="pt-4 border-t border-border">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                      Virtual Devices
                    </p>
                    <div className="space-y-2">
                      {lightDevices.map((deviceName) => {
                        const isOn = virtualDevices[deviceName] ?? false;
                        const ctrl = deviceControlledBy[deviceName];
                        return (
                          <div key={deviceName} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/50">
                            <button
                              onClick={() => {
                                setVirtualDevices(prev => ({ ...prev, [deviceName]: !isOn }));
                                setDeviceControlledBy(prev => ({ ...prev, [deviceName]: "Manual" }));
                              }}
                              title="Click to manually toggle"
                              className={cn(
                                "p-2.5 rounded-xl transition-all duration-500 shrink-0",
                                isOn
                                  ? "bg-yellow-400/20 text-yellow-400 shadow-lg shadow-yellow-400/20"
                                  : "bg-muted/50 text-muted-foreground"
                              )}
                            >
                              <Lightbulb className={cn("w-5 h-5 transition-all duration-500", isOn ? "fill-yellow-400/40" : "")} />
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm font-bold truncate transition-colors duration-500", isOn ? "text-yellow-400" : "text-muted-foreground")}>
                                {deviceName} · {isOn ? "ON" : "OFF"}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                {ctrl ? `Last: ${ctrl}` : "Click or use an applet"}
                              </p>
                            </div>
                            <div className={cn(
                              "w-2 h-2 rounded-full shrink-0 transition-all duration-500",
                              isOn ? "bg-yellow-400 shadow-[0_0_6px_2px_rgba(250,204,21,0.5)]" : "bg-muted"
                            )} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="flex gap-3">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    {isLiveMode
                      ? "Live mode active. Waiting for real events or webhook calls."
                      : "Adjust sensors to trigger applets. Webhook applets fire via /api/iot/webhook/{id}. Light auto-resets when conditions clear."}
                  </p>
                </div>
              </div>
            </div>

            {/* Activity Log */}
            <div className="flex flex-col h-[500px] p-6 rounded-[2.5rem] bg-card/40 border border-border backdrop-blur-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Activity Log
                </h2>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide">
                {!isLiveMode && simLogs.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/60">
                      <div className="h-px flex-1 bg-primary/20" />
                      Simulation Logs
                      <div className="h-px flex-1 bg-primary/20" />
                    </div>
                    {simLogs.map((log) => {
                      const ActIcon = log.actionType ? (ACTION_ICONS[log.actionType] ?? Zap) : log.status === "auto-reset" ? RotateCcw : Zap;
                      return (
                        <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          className={cn("p-3 rounded-2xl border text-xs", LOG_STATUS_CLASSES[log.status] ?? "bg-muted/30 border-border/50")}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn("font-bold flex items-center gap-1.5", LOG_NAME_CLASSES[log.status] ?? "text-primary")}>
                              <ActIcon className="w-3 h-3" /> {log.appletName}
                            </span>
                            <span className="text-[9px] opacity-40">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">{log.message}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3">
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
                    {logs.map((log) => {
                      const ActIcon = log.actionType ? (ACTION_ICONS[log.actionType] ?? Zap) : log.status === "auto-reset" ? RotateCcw : Zap;
                      return (
                        <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          className={cn("p-3 rounded-2xl border text-xs mb-3", LOG_STATUS_CLASSES[log.status] ?? "bg-muted/30 border-border/50")}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn("font-bold flex items-center gap-1.5", LOG_NAME_CLASSES[log.status] ?? "text-primary")}>
                              <ActIcon className="w-3 h-3" /> {log.appletName}
                            </span>
                            <span className="text-[9px] opacity-40">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">{log.message}</p>
                        </motion.div>
                      );
                    })}
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

      {/* Toast overlay */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3 w-80 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.92 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl",
                toast.actionType === "auto-reset"
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-card border-border"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl shrink-0",
                toast.actionType === "notification" ? "bg-primary/10"   :
                toast.actionType === "auto-reset"   ? "bg-amber-500/20" :
                toast.actionType === "webhook"      ? "bg-blue-500/10"  :
                                                      "bg-emerald-500/10"
              )}>
                {toast.actionType === "notification" ? <Bell      className="w-4 h-4 text-primary"      /> :
                 toast.actionType === "auto-reset"   ? <RotateCcw className="w-4 h-4 text-amber-400"    /> :
                 toast.actionType === "webhook"      ? <Globe     className="w-4 h-4 text-blue-400"     /> :
                                                       <Globe     className="w-4 h-4 text-emerald-400"  />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5 truncate">
                  {toast.appletName}
                </p>
                <p className="text-xs font-medium text-foreground break-words">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="p-1 hover:bg-muted rounded-lg transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </main>
  );
}

// ─── SensorSlider ────────────────────────────────────────────────────────────

function SensorSlider({
  label, value, unit, min, max, step, icon, onChange, displayValue,
}: {
  label: string; value: number; unit: string;
  min: number; max: number; step: number;
  icon: React.ReactNode;
  onChange: (v: number) => void;
  displayValue?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        <span className="flex items-center gap-2">{icon} {label}</span>
        <span className="text-foreground font-mono">{displayValue ?? value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-muted rounded-full appearance-none accent-primary cursor-pointer"
      />
    </div>
  );
}
