"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Zap, Bell, Lightbulb, Globe, Clock, Thermometer, AlertCircle,
  Droplets, Wind, Gauge, Activity, Sun, MoonStar, Copy, RotateCcw,
  Fan, Power, Radio, Camera, Lock,
} from "lucide-react";
import {
  IoTApplet, saveApplet, SENSOR_FIELDS, SENSOR_OPS,
  SensorFieldId, SensorOpId,
} from "../lib/iot-logic";
import { cn } from "@/lib/utils";

// ─── helpers ────────────────────────────────────────────────────────────────

const FIELD_ICONS: Record<string, React.ElementType> = {
  temp: Thermometer, humidity: Droplets, pressure: Gauge, co2: Wind, motion: Activity,
};

const DEVICE_ICONS = [
  { id: "lightbulb", icon: Lightbulb, label: "Light" },
  { id: "fan",       icon: Fan,       label: "Fan"   },
  { id: "plug",      icon: Power,     label: "Plug"  },
  { id: "radio",     icon: Radio,     label: "Media" },
  { id: "camera",    icon: Camera,    label: "Cam"   },
  { id: "lock",      icon: Lock,      label: "Lock"  },
];

// Step increment per sensor field for the +/- stepper
const FIELD_STEP: Record<string, number> = {
  temp: 0.5, humidity: 1, pressure: 0.5, co2: 10, motion: 1,
};

function parseSensorTrigger(value: string) {
  const parts      = value.trim().split(/\s+/);
  const validFields = SENSOR_FIELDS.map(f => f.id);
  const validOps    = SENSOR_OPS.map(o => o.id);
  if (parts.length >= 3) {
    return {
      field: (validFields.includes(parts[0] as SensorFieldId) ? parts[0] : "temp") as SensorFieldId,
      op:    (validOps.includes(parts[1] as SensorOpId)       ? parts[1] : ">")   as SensorOpId,
      val:   isNaN(parseFloat(parts[2]))                       ? "30"     : parts[2],
    };
  }
  return { field: "temp" as SensorFieldId, op: ">" as SensorOpId, val: "30" };
}

// ─── sub-builders ────────────────────────────────────────────────────────────

function WebhookConditionBuilder({
  condition, onChange
}: { condition: string; onChange: (v: string) => void }) {
  const parts = condition ? condition.trim().split(/\s+/) : ["", "==", ""];
  const [key, setKey] = useState(parts[0] || "");
  const [op, setOp]   = useState(parts[1] || "==");
  const [val, setVal] = useState(parts[2] || "");

  useEffect(() => {
    if (key.trim()) {
      onChange(`${key} ${op} ${val}`);
    } else {
      onChange("");
    }
  }, [key, op, val]);

  return (
    <div className="space-y-2 pt-2 border-t border-border/50">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
        Optional Filter (e.g. status == active)
      </p>
      <div className="flex items-center gap-2">
        <input
          type="text" value={key} onChange={(e) => setKey(e.target.value)}
          placeholder="key"
          className="w-20 bg-muted/50 border border-border rounded-xl px-2.5 py-2 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
        />
        <div className="relative group">
          <select
            value={op} onChange={(e) => setOp(e.target.value)}
            className="appearance-none bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 text-[10px] font-bold text-primary focus:outline-none cursor-pointer pr-7"
          >
            {SENSOR_OPS.map(o => <option key={o.id} value={o.id}>{o.label.split(" ").pop()?.toUpperCase() || o.id}</option>)}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
            <RotateCcw className="w-2.5 h-2.5 rotate-45" />
          </div>
        </div>
        <input
          type="text" value={val} onChange={(e) => setVal(e.target.value)}
          placeholder="value"
          className="flex-1 bg-muted/50 border border-border rounded-xl px-3 py-2 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
        />
      </div>
    </div>
  );
}

function TimeWindowBuilder({
  window, onChange
}: { window: IoTApplet["trigger"]["timeWindow"]; onChange: (w: IoTApplet["trigger"]["timeWindow"]) => void }) {
  const enabled = window?.enabled ?? false;

  return (
    <div className="space-y-3 pt-3 border-t border-border/50">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
          Active Time Window
        </p>
        <button
          type="button"
          onClick={() => onChange({ ...window, enabled: !enabled } as any)}
          className={cn(
            "w-8 h-4 rounded-full transition-all relative",
            enabled ? "bg-primary" : "bg-muted"
          )}
        >
          <div className={cn(
            "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
            enabled ? "left-4.5" : "left-0.5"
          )} />
        </button>
      </div>

      {enabled && (
        <div className="flex items-center gap-2">
          <input
            type="time" value={window?.start || "22:00"}
            onChange={(e) => onChange({ ...window, start: e.target.value } as any)}
            className="flex-1 bg-muted/50 border border-border rounded-xl px-2 py-2 text-[10px] focus:outline-none"
          />
          <span className="text-[10px] text-muted-foreground font-bold">to</span>
          <input
            type="time" value={window?.end || "06:00"}
            onChange={(e) => onChange({ ...window, end: e.target.value } as any)}
            className="flex-1 bg-muted/50 border border-border rounded-xl px-2 py-2 text-[10px] focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

function SensorTriggerBuilder({
  value, onChange, showError,
}: { value: string; onChange: (v: string) => void; showError: boolean }) {
  const parsed            = parseSensorTrigger(value);
  const [field, setField] = useState<SensorFieldId>(parsed.field);
  const [op, setOp]       = useState<SensorOpId>(parsed.op);
  const [val, setVal]     = useState(parsed.val);
  const composedRef       = useRef(`${parsed.field} ${parsed.op} ${parsed.val}`);

  // push composed string to parent
  useEffect(() => {
    const next = `${field} ${op} ${val}`;
    if (next !== composedRef.current) {
      composedRef.current = next;
      onChange(next);
    }
  }, [field, op, val]);

  // hydrate when parent sets a new value (e.g. loading an existing applet)
  useEffect(() => {
    if (value && value !== composedRef.current) {
      const p = parseSensorTrigger(value);
      setField(p.field); setOp(p.op); setVal(p.val);
      composedRef.current = value;
    }
  }, [value]);

  const fieldMeta = SENSOR_FIELDS.find(f => f.id === field);
  const step      = FIELD_STEP[field] ?? 1;

  return (
    <div className="space-y-3">
      {/* Field picker */}
      <div className="flex flex-wrap gap-2">
        {SENSOR_FIELDS.map((f) => {
          const Icon = FIELD_ICONS[f.id] ?? Thermometer;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => { setField(f.id as SensorFieldId); if (f.id === "motion") setVal("1"); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all",
                field === f.id
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="w-3.5 h-3.5" /> {f.label}
            </button>
          );
        })}
      </div>

      {/* Operator + value row */}
      <div className="flex items-center gap-2">
        <select
          value={op}
          onChange={(e) => setOp(e.target.value as SensorOpId)}
          className="flex-1 bg-muted/50 border border-border rounded-2xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
        >
          {SENSOR_OPS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>

        {field === "motion" ? (
          <div className="flex gap-2 flex-1">
            {[{ v: "1", label: "Detected" }, { v: "0", label: "None" }].map((m) => (
              <button
                key={m.v}
                type="button"
                onClick={() => setVal(m.v)}
                className={cn(
                  "flex-1 py-2.5 rounded-2xl border text-xs font-semibold transition-all",
                  val === m.v
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        ) : (
          /* ── stepper ── */
          <div className="flex items-center gap-1.5 flex-1">
            <div className="flex items-center border border-border rounded-2xl overflow-hidden flex-1 bg-muted/50">
              <button
                type="button"
                onClick={() => setVal(v => String(parseFloat(v || "0") - step))}
                className="px-3 py-2.5 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors text-sm font-bold shrink-0 select-none"
              >
                −
              </button>
              <input
                type="number"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                step={step}
                className="flex-1 bg-transparent text-xs font-mono text-center focus:outline-none py-2.5 min-w-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                placeholder="30"
              />
              <button
                type="button"
                onClick={() => setVal(v => String(parseFloat(v || "0") + step))}
                className="px-3 py-2.5 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors text-sm font-bold shrink-0 select-none"
              >
                +
              </button>
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
              {fieldMeta?.unit}
            </span>
          </div>
        )}
      </div>

      {showError && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5" /> Please fill this value
        </p>
      )}
    </div>
  );
}

function TimeTriggerBuilder({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
    />
  );
}

function LightActionBuilder({
  value, onChange, target, onTargetChange, icon, onIconChange
}: {
  value: string; onChange: (v: string) => void;
  target: string; onTargetChange: (t: string) => void;
  icon: string; onIconChange: (i: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { v: "on", label: "ON", icon: Sun, color: "text-yellow-400" },
          { v: "off", label: "OFF", icon: MoonStar, color: "text-blue-300" },
          { v: "toggle", label: "TOGGLE", icon: RotateCcw, color: "text-emerald-400" },
        ].map(opt => (
          <button
            key={opt.v}
            type="button"
            onClick={() => onChange(opt.v)}
            className={cn(
              "flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border font-bold text-[10px] transition-all",
              value === opt.v
                ? `bg-primary/10 border-primary ${opt.color} shadow-lg`
                : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
            )}
          >
            <opt.icon className="w-4 h-4" /> {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Device Icon</p>
        <div className="flex flex-wrap gap-2">
          {DEVICE_ICONS.map(i => (
            <button
              key={i.id} type="button" onClick={() => onIconChange(i.id)}
              className={cn(
                "p-2.5 rounded-xl border transition-all",
                icon === i.id ? "bg-primary/10 border-primary text-primary" : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
              )}
              title={i.label}
            >
              <i.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Device Name</label>
        <input
          type="text"
          value={target}
          onChange={(e) => onTargetChange(e.target.value)}
          placeholder="Main Light"
          className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>
    </div>
  );
}

function NotificationActionBuilder({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const insertChip = (chip: string) => {
    const el = taRef.current;
    if (!el) { onChange(value + chip); return; }
    const start = el.selectionStart ?? value.length;
    const end   = el.selectionEnd   ?? value.length;
    onChange(value.slice(0, start) + chip + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + chip.length, start + chip.length);
    });
  };

  return (
    <div className="space-y-2">
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="High Temperature Alert!"
        className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
      />
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider self-center mr-1">Insert:</span>
        {["{temp}", "{humidity}", "{pressure}", "{co2}", "{motion}"].map((chip) => (
          <button key={chip} type="button" onClick={() => insertChip(chip)}
            className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold font-mono hover:bg-primary/20 transition-colors">
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

function FetchActionBuilder({
  value, onChange, method, onMethodChange, customRes, onCustomResChange
}: {
  value: string; onChange: (v: string) => void;
  method: "GET" | "POST"; onMethodChange: (m: "GET" | "POST") => void;
  customRes: string; onCustomResChange: (r: string) => void;
}) {
  return (
    <div className="space-y-3">
      <input
        type="url" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="https://api.com/status/{id}"
        className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
      />
      <div className="flex gap-2">
        {(["POST", "GET"] as const).map((m) => (
          <button key={m} type="button" onClick={() => onMethodChange(m)}
            className={cn(
              "flex-1 py-2 rounded-xl border text-xs font-bold transition-all",
              method === m ? "bg-primary/10 border-primary text-primary" : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
            )}>
            {m}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Response to Caller (JSON)</label>
        <input
          type="text" value={customRes} onChange={(e) => onCustomResChange(e.target.value)}
          placeholder='{"status": "ok"}'
          className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-2.5 text-xs font-mono focus:outline-none"
        />
      </div>
    </div>
  );
}

// ─── main editor ─────────────────────────────────────────────────────────────

interface AppletEditorProps {
  applet?: IoTApplet | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function AppletEditor({ applet, isOpen, onClose }: AppletEditorProps) {
  const [step, setStep]                   = useState<1 | 2>(1);
  const [name, setName]                   = useState("");
  const [triggerType, setTriggerType]     = useState<IoTApplet["trigger"]["type"]>("sensor");
  const [triggerValue, setTriggerValue]   = useState("temp > 30");
  const [triggerCondition, setTriggerCondition] = useState("");
  const [timeWindow, setTimeWindow]       = useState<IoTApplet["trigger"]["timeWindow"]>({ start: "22:00", end: "06:00", enabled: false });

  const [actionType, setActionType]       = useState<IoTApplet["action"]["type"]>("notification");
  const [actionValue, setActionValue]     = useState("");
  const [fetchMethod, setFetchMethod]     = useState<"GET" | "POST">("POST");
  const [lightTarget, setLightTarget]     = useState("Main Light");
  const [lightIcon, setLightIcon]         = useState("lightbulb");
  const [customResponse, setCustomResponse] = useState("");

  const [isSaving, setIsSaving]           = useState(false);
  const [showErrors, setShowErrors]       = useState(false);

  useEffect(() => {
    if (applet) {
      setName(applet.name);
      setTriggerType(applet.trigger.type);
      setTriggerValue(applet.trigger.value);
      setTriggerCondition(applet.trigger.condition || "");
      setTimeWindow(applet.trigger.timeWindow || { start: "22:00", end: "06:00", enabled: false });

      setActionType(applet.action.type);
      setActionValue(applet.action.value);
      setFetchMethod(applet.action.fetchMethod ?? "POST");
      setLightTarget(applet.action.target ?? "Main Light");
      setLightIcon(applet.action.icon ?? "lightbulb");
      setCustomResponse(applet.action.customResponse || "");
    } else {
      setName("");
      setTriggerType("sensor");
      setTriggerValue("temp > 30");
      setTriggerCondition("");
      setTimeWindow({ start: "22:00", end: "06:00", enabled: false });

      setActionType("notification");
      setActionValue("");
      setFetchMethod("POST");
      setLightTarget("Main Light");
      setLightIcon("lightbulb");
      setCustomResponse("");
    }
    setStep(1);
    setShowErrors(false);
  }, [applet, isOpen]);

  const handleTriggerTypeChange = (type: IoTApplet["trigger"]["type"]) => {
    setTriggerType(type);
    setTriggerValue(type === "sensor" ? "temp > 30" : "");
    setShowErrors(false);
  };

  const handleActionTypeChange = (type: IoTApplet["action"]["type"]) => {
    setActionType(type);
    setActionValue(type === "light" ? "on" : "");
    if (type === "light") setLightTarget("Main Light");
    setShowErrors(false);
  };

  const handleContinue = () => {
    if (!name.trim() || !triggerValue.trim()) { setShowErrors(true); return; }
    setShowErrors(false);
    setStep(2);
  };

  const handleSave = async () => {
    if (!actionValue.trim()) { setShowErrors(true); return; }
    setIsSaving(true);
    try {
      await saveApplet({
        id:      applet?.id,
        name,
        trigger: {
          type: triggerType,
          value: triggerValue,
          condition: triggerCondition,
          timeWindow
        },
        action:  {
          type:  actionType,
          value: actionValue,
          ...(actionType === "fetch" ? { fetchMethod, customResponse } : {}),
          ...(actionType === "light" ? { target: lightTarget || "Main Light", icon: lightIcon } : {}),
        },
        enabled: applet ? applet.enabled : true,
      });
      onClose();
    } catch (e) {
      console.error("Failed to save applet", e);
    } finally {
      setIsSaving(false);
    }
  };

  const step1Valid = !!(name.trim() && triggerValue.trim());
  const step2Valid = !!(actionValue.trim());

  const TRIGGER_TYPES = [
    { id: "sensor",  label: "Sensor",  icon: Thermometer },
    { id: "time",    label: "Time",    icon: Clock       },
    { id: "webhook", label: "Webhook", icon: Globe       },
  ] as const;

  const ACTION_TYPES = [
    { id: "notification", label: "Notify",       icon: Bell      },
    { id: "light",        label: "Control",      icon: Lightbulb },
    { id: "fetch",        label: "Webhook",      icon: Globe     },
  ] as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[160] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-md bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]">

              {/* Title bar */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">{applet ? "Edit Applet" : "New Applet"}</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-3 px-6 pb-4 shrink-0">
                {([1, 2] as const).map((s) => (
                  <React.Fragment key={s}>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300",
                        step === s ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" :
                        step > s   ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {step > s ? "✓" : s}
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest transition-colors duration-300",
                        step === s ? "text-primary" : "text-muted-foreground/40"
                      )}>
                        {s === 1 ? "Trigger" : "Action"}
                      </span>
                    </div>
                    {s < 2 && <div className="flex-1 h-px bg-border" />}
                  </React.Fragment>
                ))}
              </div>

              <div className="h-px bg-border shrink-0" />

              {/* Step content */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait" initial={false}>
                  {step === 1 ? (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.18 }}
                      className="p-6 space-y-6"
                    >
                      {/* Name */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                          Applet Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => { setName(e.target.value); setShowErrors(false); }}
                          placeholder="e.g., Morning Coffee Maker"
                          autoFocus
                          className={cn(
                            "w-full bg-muted/50 border rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
                            showErrors && !name.trim() ? "border-red-500/60" : "border-border"
                          )}
                        />
                      </div>

                      {/* Trigger */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                            When this happens…
                          </p>
                        </div>

                        <div className="flex gap-2">
                          {TRIGGER_TYPES.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleTriggerTypeChange(t.id)}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all text-xs font-semibold",
                                triggerType === t.id
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "bg-muted/30 border-transparent hover:bg-muted/50 text-muted-foreground"
                              )}
                            >
                              <t.icon className="w-3.5 h-3.5" /> {t.label}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-4">
                          {triggerType === "sensor" && (
                            <SensorTriggerBuilder
                              value={triggerValue}
                              onChange={(v) => { setTriggerValue(v); setShowErrors(false); }}
                              showError={showErrors && !triggerValue.trim()}
                            />
                          )}
                          {triggerType === "time" && (
                            <TimeTriggerBuilder
                              value={triggerValue}
                              onChange={(v) => { setTriggerValue(v); setShowErrors(false); }}
                            />
                          )}
                          {triggerType === "webhook" && (
                            <div className="space-y-3">
                              <input
                                type="text" value={triggerValue}
                                onChange={(e) => { setTriggerValue(e.target.value); setShowErrors(false); }}
                                placeholder="my-sensor-id"
                                className={cn(
                                  "w-full bg-muted/50 border rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
                                  showErrors && !triggerValue.trim() ? "border-red-500/60" : "border-border"
                                )}
                              />
                              {/* Webhook Trigger Info */}
                              {applet?.id && (
                                <div className="space-y-2 mt-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                                      Trigger Link (fires action on page)
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const ts = Date.now();
                                        const curl = `curl -X PUT "https://portfolio-projects-773a3-default-rtdb.firebaseio.com/iot_bridge/applets/${applet.id}/webhookTrigger.json" -H "Content-Type: application/json" -d "{\\"params\\":{\\"key\\":\\"value\\"},\\"timestamp\\":${ts}}"`;
                                        navigator.clipboard.writeText(curl);
                                      }}
                                      className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-primary hover:text-primary/70 transition-colors px-2 py-0.5 rounded-lg hover:bg-primary/10"
                                    >
                                      <Copy className="w-2.5 h-2.5" /> Copy
                                    </button>
                                  </div>
                                  <div className="bg-muted/50 border border-border/60 rounded-2xl p-3 overflow-x-auto">
                                    <pre className="text-[10px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap break-all">{
`curl -X PUT "…/applets/${applet.id.slice(0, 14)}…/webhookTrigger.json" -H "Content-Type: application/json" -d "{\\"params\\":{\\"key\\":\\"value\\"},\\"timestamp\\":…}"`
                                    }</pre>
                                  </div>
                                </div>
                              )}
                              <WebhookConditionBuilder
                                condition={triggerCondition}
                                onChange={setTriggerCondition}
                              />
                            </div>
                          )}

                          <TimeWindowBuilder
                            window={timeWindow}
                            onChange={setTimeWindow}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{ duration: 0.18 }}
                      className="p-6 space-y-6"
                    >
                      {/* Trigger summary chip */}
                      <div className="flex items-center gap-2 p-3 rounded-2xl bg-primary/5 border border-primary/10">
                        <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
                          {triggerType === "sensor" ? <Thermometer className="w-3.5 h-3.5 text-primary" /> :
                           triggerType === "time"   ? <Clock        className="w-3.5 h-3.5 text-primary" /> :
                                                      <Globe        className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Trigger</p>
                          <p className="text-xs font-semibold truncate">{name} · {triggerValue}</p>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                          Do this action…
                        </p>

                        <div className="flex gap-2">
                          {ACTION_TYPES.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleActionTypeChange(t.id)}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all text-xs font-semibold",
                                actionType === t.id
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "bg-muted/30 border-transparent hover:bg-muted/50 text-muted-foreground"
                              )}
                            >
                              <t.icon className="w-3.5 h-3.5" /> {t.label}
                            </button>
                          ))}
                        </div>

                        <div>
                          {actionType === "light" && (
                            <LightActionBuilder
                              value={actionValue}
                              onChange={(v) => { setActionValue(v); setShowErrors(false); }}
                              target={lightTarget}
                              onTargetChange={setLightTarget}
                              icon={lightIcon}
                              onIconChange={setLightIcon}
                            />
                          )}
                          {actionType === "notification" && (
                            <NotificationActionBuilder
                              value={actionValue}
                              onChange={(v) => { setActionValue(v); setShowErrors(false); }}
                            />
                          )}
                          {actionType === "fetch" && (
                            <FetchActionBuilder
                              value={actionValue}
                              onChange={(v) => { setActionValue(v); setShowErrors(false); }}
                              method={fetchMethod}
                              onMethodChange={setFetchMethod}
                              customRes={customResponse}
                              onCustomResChange={setCustomResponse}
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Conditional footer */}
              <div className="h-px bg-border shrink-0" />
              {step === 1 ? (
                <div className="flex gap-3 p-5 bg-muted/20 shrink-0">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3.5 rounded-2xl border border-border text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContinue}
                    className={cn(
                      "flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all",
                      step1Valid
                        ? "bg-primary text-primary-foreground hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    Continue →
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 p-5 bg-muted/20 shrink-0">
                  <button
                    onClick={() => { setStep(1); setShowErrors(false); }}
                    className="flex-1 py-3.5 rounded-2xl border border-border text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={cn(
                      "flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl",
                      step2Valid
                        ? "bg-primary text-primary-foreground hover:scale-[1.02] active:scale-95 shadow-primary/20"
                        : "bg-muted text-muted-foreground cursor-not-allowed",
                      isSaving && "opacity-50"
                    )}
                  >
                    {isSaving ? "Saving…" : "Save Applet"}
                  </button>
                </div>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
