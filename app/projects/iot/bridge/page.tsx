"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Cpu, Zap, Bell, Lightbulb, Globe, X,
  Settings, Plus, Trash2, History,
  Play, Pause, Sliders, Info, Activity, Thermometer,
  Droplets, Wind, Gauge, RotateCcw, ArrowRight, Clock, Copy,
  Search, Fan, Power, Radio, Camera, Lock, CheckCircle2, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeContext";
import {
  IoTApplet, IoTLog, SensorData,
  SENSOR_FIELDS, SENSOR_OPS,
  subscribeToApplets, subscribeToLogs, deleteApplet, saveApplet,
  evaluateApplet, checkSensorCondition, executeAction,
  clearWebhookTrigger, clearLogs, checkWebhookCondition, injectVariables,
} from "./lib/iot-logic";
import AppletEditor from "./components/AppletEditor";
import "./themes.css";

// ─── pure helpers ────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  lightbulb: Lightbulb,
  fan:       Fan,
  plug:      Power,
  radio:     Radio,
  camera:    Camera,
  lock:      Lock,
};

function formatTriggerText(applet: IoTApplet): string {
  if (applet.trigger.type === "time")    return `At ${applet.trigger.value}`;
  if (applet.trigger.type === "webhook") {
    let text = `Webhook: ${applet.trigger.value.slice(0, 15)}`;
    if (applet.trigger.condition) text += ` (if ${applet.trigger.condition})`;
    return text;
  }
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
    const val = applet.action.value.toUpperCase();
    return `${dev}: ${val}`;
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

function formatFullDateTime(ts: number): string {
  const d = new Date(ts);
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
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

// ─── page ────────────────────────────────────────────────────────────────────

export default function IoTBridgePage() {
  const { mode: globalMode } = useTheme();

  // Data
  const [applets, setApplets] = useState<IoTApplet[]>([]);
  const [logs, setLogs]       = useState<IoTLog[]>([]);
  const [simLogs, setSimLogs] = useState<IoTLog[]>([]);

  // UI
  const [isEditorOpen, setIsEditorOpen]   = useState(false);
  const [editingApplet, setEditingApplet] = useState<IoTApplet | null>(null);
  const [isLiveMode, setIsLiveMode]       = useState(false);
  const [logFilter, setLogFilter]         = useState("");

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

  // Action feedback
  const [virtualDevices, setVirtualDevices]         = useState<Record<string, boolean>>({});
  const [deviceControlledBy, setDeviceControlledBy] = useState<Record<string, string>>({});
  const [fetchResponses, setFetchResponses]          = useState<Record<string, { status: number; body: string; ts: number }>>({});
  const [toasts, setToasts]                         = useState<{ id: string; message: string; appletName: string; actionType: string }[]>([]);

  // Applet active state (for hysteresis)
  const [appletActiveStates, setAppletActiveStates] = useState<Record<string, boolean>>({});
  const appletActiveStatesRef = useRef<Record<string, boolean>>({});
  useEffect(() => { appletActiveStatesRef.current = appletActiveStates; }, [appletActiveStates]);

  // Derive light devices with icons
  const lightDevices = useMemo(() => {
    const devices: Record<string, { name: string; icon: string }> = {};
    applets.forEach(a => {
      if (a.action.type === "light") {
        const name = a.action.target || "Main Light";
        devices[name] = { name, icon: a.action.icon || "lightbulb" };
      }
    });
    if (Object.keys(devices).length === 0) devices["Main Light"] = { name: "Main Light", icon: "lightbulb" };
    return Object.values(devices);
  }, [applets]);

  // Success rates
  const appletStats = useMemo(() => {
    const stats: Record<string, { total: number; success: number }> = {};
    logs.slice(0, 100).forEach(log => {
      if (!stats[log.appletId]) stats[log.appletId] = { total: 0, success: 0 };
      stats[log.appletId].total++;
      if (log.status === "success") stats[log.appletId].success++;
    });
    return stats;
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const combined = [...simLogs, ...logs];
    return combined.filter(l =>
      l.appletName.toLowerCase().includes(logFilter.toLowerCase()) ||
      l.message.toLowerCase().includes(logFilter.toLowerCase())
    ).slice(0, 50);
  }, [logs, simLogs, logFilter]);

  // ── helpers ──

  const addToast = (appletName: string, message: string, actionType: string) => {
    const id = `t_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev.slice(-4), { id, message, appletName, actionType }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  };

  const handleActionEffect = (
    applet: IoTApplet,
    isAutoReset = false,
    fetchResponse?: { status: number; body: string },
    params?: Record<string, string>
  ) => {
    if (applet.action.type === "light") {
      const deviceName = applet.action.target || "Main Light";
      const val = applet.action.value.toLowerCase();

      setVirtualDevices(prev => {
        const current = prev[deviceName] ?? false;
        let next = current;
        if (val === "on") next = true;
        else if (val === "off") next = false;
        else if (val === "toggle") next = !current;
        return { ...prev, [deviceName]: next };
      });

      setDeviceControlledBy(prev => ({
        ...prev,
        [deviceName]: isAutoReset ? `Auto-reset (${applet.name})` : applet.name,
      }));
    } else if (applet.action.type === "notification") {
      const message = injectVariables(applet.action.value, params, sensorDataRef.current);
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

  const handleManualTrigger = async (applet: IoTApplet) => {
    const result = await executeAction(applet, isLiveMode, {}, sensorDataRef.current);
    if (result) {
      if (!isLiveMode) setSimLogs(prev => [{ ...result, id: `man_${Date.now()}` }, ...prev].slice(0, 20));
      handleActionEffect(applet, false, result.fetchResponse);
      addToast(applet.name, "Manually triggered", applet.action.type);
    }
  };

  // ── subscriptions ──

  useEffect(() => {
    const unsubApplets = subscribeToApplets(setApplets);
    const unsubLogs = subscribeToLogs(setLogs);
    return () => { unsubApplets(); unsubLogs(); };
  }, []);

  // ── webhook trigger handler ──
  useEffect(() => {
    applets.forEach(async (applet) => {
      if (!applet.webhookTrigger) return;
      if (!applet.enabled || applet.trigger.type !== "webhook") return;

      const { params, timestamp } = applet.webhookTrigger;

      // Clear from Firebase immediately
      await clearWebhookTrigger(applet.id);

      // 1. Condition check
      if (applet.trigger.condition) {
        const ok = checkWebhookCondition(applet.trigger.condition, params);
        if (!ok) {
           addToast(applet.name, "Webhook filtered (condition not met)", "skipped");
           const skipLog: IoTLog = {
             id: `skip_${Date.now()}`,
             appletId: applet.id,
             appletName: applet.name,
             timestamp: Date.now(),
             status: "skipped",
             message: `Webhook skipped: Condition (${applet.trigger.condition}) not met by ${JSON.stringify(params)}`
           };
           setSimLogs(prev => [skipLog, ...prev].slice(0, 20));
           return;
        }
      }

      // 2. Execute
      const result = await executeAction(applet, isLiveMode, params, sensorDataRef.current);
      if (result) {
        if (!isLiveMode) setSimLogs(prev => [{ ...result, id: `wh_${Date.now()}` }, ...prev].slice(0, 20));
        handleActionEffect(applet, false, result.fetchResponse, params);
        addToast(applet.name, "Webhook received", "webhook");
      }
    });
  }, [applets, isLiveMode]);

  // ── evaluation ──
  useEffect(() => {
    applets.forEach(async (applet) => {
      if (!applet.enabled || applet.trigger.type !== "sensor") return;

      const isActive  = checkSensorCondition(applet, sensorData);
      const wasActive = appletActiveStatesRef.current[applet.id] ?? false;

      if (isActive !== wasActive) {
        setAppletActiveStates(prev => ({ ...prev, [applet.id]: isActive }));

        // Falling edge -> Auto reset (Inverse action)
        if (!isActive && wasActive && applet.action.type === "light" && applet.action.value !== "toggle") {
           const inverseValue = applet.action.value.toLowerCase() === "on" ? "off" : "on";
           const inverseApplet = { ...applet, action: { ...applet.action, value: inverseValue } };
           const result = await executeAction(inverseApplet, isLiveMode, {}, sensorDataRef.current);
           if (result) {
              const resetLog: IoTLog = {
                ...result,
                id: `reset_${Date.now()}_${applet.id}`,
                status: "auto-reset" as const,
                message: `Auto-reset: ${applet.action.target || "Main Light"} → ${inverseValue.toUpperCase()} (Condition cleared)`
              };
              if (!isLiveMode) setSimLogs(prev => [resetLog, ...prev].slice(0, 20));
              handleActionEffect(inverseApplet, true);
              addToast(applet.name, `Auto-reset to ${inverseValue.toUpperCase()}`, "auto-reset");
           }
        }
      }

      // Rising edge
      if (isActive && !wasActive) {
        const result = await evaluateApplet(applet, sensorData, isLiveMode);
        if (result) {
          if (!isLiveMode) setSimLogs(prev => [{ ...result, id: `sim_${Date.now()}` }, ...prev].slice(0, 20));
          handleActionEffect(applet, false, result.fetchResponse);
        }
      }
    });
  }, [sensorData, applets, isLiveMode]);

  // ── simulation ──
  useEffect(() => {
    if (isSimulationRunning && !isLiveMode) {
      simulationInterval.current = setInterval(() => {
        setTemp(t     => parseFloat(Math.min(50,   Math.max(0,   t + (Math.random() - 0.5) * 2)).toFixed(1)));
        setHumidity(h => parseFloat(Math.min(100,  Math.max(0,   h + (Math.random() - 0.5) * 5)).toFixed(1)));
        setPressure(p => parseFloat(Math.min(1050, Math.max(950, p + (Math.random() - 0.5) * 1)).toFixed(1)));
        setCo2(c      => parseFloat(Math.min(2000, Math.max(400, c + (Math.random() - 0.3) * 15)).toFixed(0)));
        if (Math.random() < 0.05) setMotionVal(mv => mv === 0 ? 1 : 0);
      }, 3000);
    } else {
      clearInterval(simulationInterval.current!);
    }
    return () => clearInterval(simulationInterval.current!);
  }, [isSimulationRunning, isLiveMode]);

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
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20 text-white">
                <Cpu className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter">
                  IoT <span className="text-muted-foreground">Bridge</span>
                </h1>
                <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
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
                className="flex items-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> New Applet
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
                 <p className="text-muted-foreground">No applets yet.</p>
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {applets.map((applet) => {
                    const TrigIcon  = TRIGGER_ICONS[applet.trigger.type] ?? Zap;
                    const ActIcon   = ACTION_ICONS[applet.action.type]   ?? Zap;
                    const stats     = appletStats[applet.id];
                    const rate      = stats ? Math.round((stats.success / stats.total) * 100) : null;
                    const isActive  = applet.trigger.type === "sensor" && (appletActiveStates[applet.id] ?? false);
                    const isWebhookListening = applet.trigger.type === "webhook" && applet.enabled;

                    return (
                      <motion.div
                        key={applet.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "relative group p-6 rounded-[2.5rem] border bg-card/40 transition-all duration-500",
                          applet.enabled ? (isActive ? "border-emerald-500/40 shadow-lg shadow-emerald-500/5" : "border-border hover:border-primary/20 shadow-lg") : "opacity-60 grayscale-[0.5]"
                        )}
                      >
                        <div className={cn(
                          "absolute top-5 left-5 w-2.5 h-2.5 rounded-full transition-all duration-500",
                          isActive ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_2px_rgba(16,185,129,0.5)]" :
                          isWebhookListening ? "bg-blue-500 animate-pulse shadow-[0_0_6px_2px_rgba(59,130,246,0.4)]" : "bg-muted"
                        )} />

                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleManualTrigger(applet)} className="p-2 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors" title="Manual Trigger"><Play className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { setEditingApplet(applet); setIsEditorOpen(true); }} className="p-2 rounded-xl hover:bg-muted" title="Edit"><Settings className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteApplet(applet.id)} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>

                        <div className="flex items-center gap-3 mt-2 mb-5">
                          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400"><TrigIcon className="w-5 h-5" /></div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground/20 shrink-0" />
                          <div className={cn("p-3 rounded-2xl bg-gradient-to-br", ACTION_COLORS[applet.action.type] ?? "from-muted to-muted/50")}>
                             <ActIcon className={cn("w-5 h-5", applet.action.type === "light" ? "text-yellow-400" : "text-primary")} />
                          </div>
                        </div>

                        <h3 className="text-base font-bold mb-3 truncate">{applet.name}</h3>
                        <div className="space-y-1 mb-4">
                           <p className="text-[10px] text-muted-foreground"><span className="text-[8px] font-black uppercase opacity-40 mr-1.5">IF</span> {formatTriggerText(applet)}</p>
                           <p className="text-[10px] text-muted-foreground"><span className="text-[8px] font-black uppercase opacity-40 mr-1.5">THEN</span> {formatActionText(applet)}</p>
                        </div>

                        {/* Webhook Curl Chip */}
                        {applet.trigger.type === "webhook" && (
                          <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 mb-3 overflow-hidden">
                            <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                              <span className="text-[9px] font-black uppercase tracking-widest text-blue-400/70">
                                Trigger Link
                              </span>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  const ts = Date.now();
                                  const curl = `curl -X PUT "https://portfolio-projects-773a3-default-rtdb.firebaseio.com/iot_bridge/applets/${applet.id}/webhookTrigger.json" -H "Content-Type: application/json" -d "{\\"params\\":{\\"key\\":\\"value\\"},\\"timestamp\\":${ts}}"`;
                                  navigator.clipboard.writeText(curl);
                                  addToast("System", "Universal Curl copied!", "webhook");
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

                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] text-muted-foreground/50 font-mono">{formatRelativeTime(applet.lastRun)}</span>
                             {rate !== null && (
                               <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-emerald-500/10", rate > 80 ? "text-emerald-400" : "text-amber-400")}>
                                 {rate}% Success
                               </span>
                             )}
                          </div>
                          <button
                            onClick={() => saveApplet({ ...applet, enabled: !applet.enabled })}
                            className={cn("w-10 h-5 rounded-full transition-all relative", applet.enabled ? "bg-primary" : "bg-muted")}
                          >
                            <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow", applet.enabled ? "left-5" : "left-0.5")} />
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
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    isSimulationRunning ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                  )}
                >
                  {isSimulationRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>

              {isLiveMode ? (
                <div className="py-10 text-center space-y-3">
                  <Activity className="w-8 h-8 mx-auto text-muted-foreground opacity-20 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Waiting for Live Data</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <SensorSlider label="Temperature" value={temp}     unit="°C"  min={0}   max={50}   step={0.1} icon={<Thermometer className="w-3.5 h-3.5" />} onChange={setTemp} />
                  <SensorSlider label="Humidity"    value={humidity} unit="%"   min={0}   max={100}  step={1}   icon={<Droplets    className="w-3.5 h-3.5" />} onChange={setHumidity} />
                  <SensorSlider label="Pressure"    value={pressure} unit=" hPa" min={950} max={1050} step={0.5} icon={<Gauge       className="w-3.5 h-3.5" />} onChange={setPressure} displayValue={pressure.toFixed(1)} />
                  <SensorSlider label="CO₂"         value={co2}      unit=" ppm" min={400} max={2000} step={10}  icon={<Wind        className="w-3.5 h-3.5" />} onChange={setCo2} displayValue={Math.round(co2).toString()} />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <span className="flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Motion</span>
                      <span className={motionVal === 1 ? "text-emerald-400" : ""}>{motionVal === 1 ? "Detected" : "None"}</span>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => setMotionVal(0)} className={cn("flex-1 py-2 rounded-xl border text-[10px] font-bold transition-all", motionVal === 0 ? "bg-muted text-foreground" : "text-muted-foreground")}>None</button>
                       <button onClick={() => setMotionVal(1)} className={cn("flex-1 py-2 rounded-xl border text-[10px] font-bold transition-all", motionVal === 1 ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : "text-muted-foreground")}>Detected</button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Virtual Devices</p>
                    <div className="space-y-2">
                      {lightDevices.map(dev => {
                        const isOn = virtualDevices[dev.name] ?? false;
                        const Icon = ICON_MAP[dev.icon] || Lightbulb;
                        return (
                          <div key={dev.name} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/50 transition-all duration-500">
                             <button
                               onClick={() => {
                                 setVirtualDevices(p => ({ ...p, [dev.name]: !isOn }));
                                 setDeviceControlledBy(p => ({ ...p, [dev.name]: "Manual" }));
                               }}
                               className={cn("p-2.5 rounded-xl transition-all duration-500", isOn ? "bg-yellow-400/20 text-yellow-400 shadow-lg" : "bg-muted/50 text-muted-foreground")}
                             >
                                <Icon className={cn("w-5 h-5", isOn && "fill-yellow-400/40")} />
                             </button>
                             <div className="flex-1 min-w-0">
                               <p className={cn("text-sm font-bold truncate transition-colors", isOn ? "text-yellow-400" : "text-muted-foreground")}>{dev.name}</p>
                               <p className="text-[9px] text-muted-foreground/60 truncate">{isOn ? "ON" : "OFF"} · {deviceControlledBy[dev.name] || "Ready"}</p>
                             </div>
                             <div className={cn("w-1.5 h-1.5 rounded-full transition-all", isOn ? "bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)]" : "bg-muted")} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Activity Log */}
            <div className="flex flex-col h-[550px] p-6 rounded-[2.5rem] bg-card/40 border border-border backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                   <div className="p-2 bg-primary/10 rounded-xl">
                      <History className="w-5 h-5 text-primary" />
                   </div>
                   <h2 className="text-lg font-bold">Activity Log</h2>
                </div>
                <button
                   onClick={() => confirm("Clear all logs?") && clearLogs()}
                   className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                >
                   Clear
                </button>
              </div>

              <div className="relative mb-5">
                 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                 <input
                   type="text" placeholder="Search logs..." value={logFilter} onChange={e => setLogFilter(e.target.value)}
                   className="w-full bg-muted/20 border border-border/50 rounded-2xl pl-10 pr-4 py-3 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                 />
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                <AnimatePresence initial={false}>
                  {filteredLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                       <Activity className="w-10 h-10 mb-2" />
                       <p className="text-xs font-bold uppercase tracking-widest">No matching activity</p>
                    </div>
                  ) : (
                    filteredLogs.map((log) => {
                       const isSuccess = log.status === "success";
                       const isReset   = log.status === "auto-reset";
                       const isSkipped = log.status === "skipped";
                       const ActIcon   = log.actionType ? (ACTION_ICONS[log.actionType] ?? Zap) : isReset ? RotateCcw : Zap;

                       return (
                        <motion.div
                           key={log.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                           className={cn(
                              "group p-4 rounded-[1.75rem] border transition-all duration-300",
                              isSuccess ? "bg-emerald-500/[0.03] border-emerald-500/10 hover:border-emerald-500/30 shadow-sm" :
                              isReset   ? "bg-amber-500/[0.03] border-amber-500/10 hover:border-amber-500/30" :
                              isSkipped ? "bg-muted/10 border-border/40 opacity-60" :
                                          "bg-red-500/[0.03] border-red-500/10 hover:border-red-500/30"
                           )}
                        >
                           <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                 <div className={cn(
                                    "p-2 rounded-xl shrink-0",
                                    isSuccess ? "bg-emerald-500/10 text-emerald-500" :
                                    isReset   ? "bg-amber-500/10 text-amber-500" :
                                    isSkipped ? "bg-muted text-muted-foreground" : "bg-red-500/10 text-red-500"
                                 )}>
                                    <ActIcon className="w-3.5 h-3.5" />
                                 </div>
                                 <div className="min-w-0">
                                    <h4 className={cn(
                                       "text-xs font-bold truncate",
                                       isSuccess ? "text-emerald-400" :
                                       isReset   ? "text-amber-400" :
                                       isSkipped ? "text-muted-foreground" : "text-red-400"
                                    )}>
                                       {log.appletName}
                                    </h4>
                                    <p className="text-[9px] text-muted-foreground/60 font-medium">
                                       {isReset ? "Auto-Reset" : isSkipped ? "Filtered" : "Execution"}
                                    </p>
                                 </div>
                              </div>
                              <span className="text-[8px] font-bold text-muted-foreground/40 whitespace-nowrap mt-1 uppercase tracking-tighter">
                                 {formatFullDateTime(log.timestamp)}
                              </span>
                           </div>

                           <div className="pl-11 pr-2">
                              <p className="text-[10px] leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors break-words">
                                 {log.message}
                              </p>
                              {log.fetchResponse && (
                                 <div className="mt-2 p-2 rounded-xl bg-muted/40 border border-border/40 text-[9px] font-mono text-muted-foreground/80 break-all">
                                    <span className="font-black text-primary mr-1">{log.fetchResponse.status}</span>
                                    {log.fetchResponse.body.slice(0, 100)}
                                 </div>
                              )}
                           </div>
                        </motion.div>
                       );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>
        </div>
      </div>
      <AppletEditor isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} applet={editingApplet} />

      {/* Toast Overlay */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-72 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div key={toast.id} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card border border-border p-4 rounded-2xl shadow-2xl pointer-events-auto flex items-start gap-3 backdrop-blur-xl"
            >
              <div className={cn("p-2 rounded-xl text-primary", toast.actionType === "webhook" ? "bg-blue-500/10 text-blue-400" : "bg-primary/10")}>
                 {toast.actionType === "notification" ? <Bell className="w-3.5 h-3.5" /> :
                  toast.actionType === "webhook" ? <Globe className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] font-black uppercase text-muted-foreground mb-0.5">{toast.appletName}</p>
                <p className="text-[11px] font-medium leading-tight">{toast.message}</p>
              </div>
              <button onClick={() => setToasts(p => p.filter(t => t.id !== toast.id))} className="p-1 hover:bg-muted rounded-lg"><X className="w-3 h-3" /></button>
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

function SensorSlider({ label, value, unit, min, max, step, icon, onChange, displayValue }: any) {
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
