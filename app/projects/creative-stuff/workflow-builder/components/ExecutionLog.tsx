"use client";
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LogEntry } from '../lib/types';

interface Props {
  entries: LogEntry[];
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
  height: number;
  onResizeStart: (e: React.MouseEvent) => void;
}

const typeStyle: Record<string, string> = {
  info:    'text-zinc-400',
  success: 'text-emerald-400',
  error:   'text-red-400',
  data:    'text-blue-400',
};

const typePrefix: Record<string, string> = {
  info:    '▸',
  success: '✓',
  error:   '✗',
  data:    '~',
};

export function ExecutionLog({ entries, onClear, isOpen, onToggle, height, onResizeStart }: Props) {
  return (
    <div
      className="relative flex flex-col border-t border-zinc-800 bg-zinc-950 flex-shrink-0"
      style={{ height: isOpen ? height : 36 }}
    >
      {/* Resize drag handle — only when open */}
      {isOpen && (
        <div
          className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-zinc-600 transition-colors z-10"
          onMouseDown={onResizeStart}
        />
      )}

      <div className="flex items-center justify-between px-3 h-9 flex-shrink-0 border-b border-zinc-800">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest hover:text-zinc-200 transition-colors"
        >
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          Execution Log
          {entries.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{entries.length}</span>
          )}
        </button>
        {isOpen && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {isOpen && (
        <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] space-y-0.5 min-h-0">
          {entries.length === 0 ? (
            <span className="text-zinc-600">No executions yet. Click ▶ Run to start.</span>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="flex gap-2 items-start">
                <span className="text-zinc-600 flex-shrink-0 select-none">
                  {entry.timestamp.toLocaleTimeString('en-US', { hour12: false })}
                </span>
                <span className={cn('flex-shrink-0', typeStyle[entry.type])}>{typePrefix[entry.type]}</span>
                <span className={typeStyle[entry.type]}>
                  {entry.message}
                  {entry.data !== undefined && (
                    <span className="text-zinc-500 ml-2">
                      {JSON.stringify(entry.data).slice(0, 120)}
                      {JSON.stringify(entry.data).length > 120 ? '…' : ''}
                    </span>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
