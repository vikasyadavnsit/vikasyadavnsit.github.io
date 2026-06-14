'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import type { MonitorEvent, AlertSeverity } from '../types';

interface AlertBannerProps {
  activeAlerts: MonitorEvent[];
  onDismiss: (id: string) => void;
}

const icons: Record<AlertSeverity, typeof AlertTriangle> = {
  CRITICAL: AlertCircle,
  WARNING: AlertTriangle,
  INFO: Info,
};

const colors: Record<AlertSeverity, string> = {
  CRITICAL: 'bg-red-500/20 border-red-500/40 text-red-300',
  WARNING: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
  INFO: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
};

export default function AlertBanner({ activeAlerts, onDismiss }: AlertBannerProps) {
  const visible = activeAlerts.filter(a => a.severity !== 'INFO').slice(-3);

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {visible.map(alert => {
          const Icon = icons[alert.severity];
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium ${colors[alert.severity]}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{alert.message}</span>
              <span className="text-xs opacity-60 flex-shrink-0">
                {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                onClick={() => onDismiss(alert.id)}
                className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
