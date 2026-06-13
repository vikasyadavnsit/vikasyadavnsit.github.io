"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Bell, Lightbulb, Globe, Clock, Thermometer } from "lucide-react";
import { IoTApplet, saveApplet } from "../lib/iot-logic";
import { cn } from "@/lib/utils";

interface AppletEditorProps {
  applet?: IoTApplet | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function AppletEditor({ applet, isOpen, onClose }: AppletEditorProps) {
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<IoTApplet["trigger"]["type"]>("sensor");
  const [triggerValue, setTriggerValue] = useState("");
  const [actionType, setActionType] = useState<IoTApplet["action"]["type"]>("notification");
  const [actionValue, setActionValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (applet) {
      setName(applet.name);
      setTriggerType(applet.trigger.type);
      setTriggerValue(applet.trigger.value);
      setActionType(applet.action.type);
      setActionValue(applet.action.value);
    } else {
      setName("");
      setTriggerType("sensor");
      setTriggerValue("temp > 30");
      setActionType("notification");
      setActionValue("High Temperature Alert!");
    }
  }, [applet, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await saveApplet({
        id: applet?.id,
        name,
        trigger: { type: triggerType, value: triggerValue },
        action: { type: actionType, value: actionValue },
        enabled: applet ? applet.enabled : true
      });
      onClose();
    } catch (e) {
      console.error("Failed to save applet", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[160] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-lg bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">{applet ? "Edit Applet" : "Create Applet"}</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Name */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Applet Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Morning Coffee Maker"
                    className="w-full bg-muted/50 border border-border rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Trigger */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">If This (Trigger)</label>
                    <div className="space-y-2">
                      {[
                        { id: 'sensor', label: 'Sensor', icon: Thermometer },
                        { id: 'time', label: 'Time', icon: Clock },
                        { id: 'webhook', label: 'Webhook', icon: Globe }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTriggerType(t.id as any)}
                          className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-sm",
                            triggerType === t.id ? "bg-primary/10 border-primary text-primary" : "bg-muted/30 border-transparent hover:bg-muted/50"
                          )}
                        >
                          <t.icon className="w-4 h-4" />
                          <span className="font-semibold">{t.label}</span>
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={triggerValue}
                      onChange={(e) => setTriggerValue(e.target.value)}
                      placeholder={triggerType === 'sensor' ? 'temp > 30' : (triggerType === 'time' ? '08:00' : 'Webhook ID')}
                      className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none"
                    />
                  </div>

                  {/* Action */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Then That (Action)</label>
                    <div className="space-y-2">
                      {[
                        { id: 'notification', label: 'Notify', icon: Bell },
                        { id: 'light', label: 'Toggle Light', icon: Lightbulb },
                        { id: 'fetch', label: 'Webhook', icon: Globe }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setActionType(t.id as any)}
                          className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-sm",
                            actionType === t.id ? "bg-primary/10 border-primary text-primary" : "bg-muted/30 border-transparent hover:bg-muted/50"
                          )}
                        >
                          <t.icon className="w-4 h-4" />
                          <span className="font-semibold">{t.label}</span>
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={actionValue}
                      onChange={(e) => setActionValue(e.target.value)}
                      placeholder={actionType === 'notification' ? 'Message' : (actionType === 'light' ? 'on/off' : 'https://...')}
                      className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-xs font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border bg-muted/20">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !name.trim()}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.02] transition-all shadow-xl shadow-primary/20 disabled:opacity-50 disabled:scale-100"
                >
                  {isSaving ? "Saving..." : "Save Applet"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
