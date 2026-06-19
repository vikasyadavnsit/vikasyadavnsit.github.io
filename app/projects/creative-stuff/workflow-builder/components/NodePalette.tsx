"use client";
import { Zap, Globe, Shuffle, Bell, Code2 } from 'lucide-react';

interface PaletteItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  border: string;
  bg: string;
  description: string;
}

const ITEMS: PaletteItem[] = [
  { type: 'trigger',   label: 'Trigger',   icon: <Zap    className="w-4 h-4 text-amber-300"   />, border: 'border-amber-500/40',   bg: 'bg-amber-500/10',   description: 'Start your workflow' },
  { type: 'http',      label: 'HTTP',      icon: <Globe  className="w-4 h-4 text-blue-300"    />, border: 'border-blue-500/40',    bg: 'bg-blue-500/10',    description: 'Make an HTTP request' },
  { type: 'transform', label: 'Transform', icon: <Shuffle className="w-4 h-4 text-purple-300" />, border: 'border-purple-500/40',  bg: 'bg-purple-500/10',  description: 'Filter or map data' },
  { type: 'notify',    label: 'Notify',    icon: <Bell   className="w-4 h-4 text-emerald-300" />, border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', description: 'Send a notification' },
  { type: 'code',      label: 'Code',      icon: <Code2  className="w-4 h-4 text-pink-300"    />, border: 'border-pink-500/40',    bg: 'bg-pink-500/10',    description: 'Run a JS snippet' },
];

export function NodePalette() {
  function onDragStart(e: React.DragEvent, type: string) {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <aside className="w-[148px] flex-shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col overflow-y-auto">
      <div className="px-3 py-3 border-b border-zinc-800">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Nodes</p>
      </div>
      <div className="p-2 flex flex-col gap-1.5">
        {ITEMS.map(item => (
          <div
            key={item.type}
            draggable
            onDragStart={e => onDragStart(e, item.type)}
            className={`flex flex-col gap-1 p-2.5 rounded-lg border cursor-grab active:cursor-grabbing select-none transition-all hover:brightness-125 ${item.border} ${item.bg}`}
          >
            <div className="flex items-center gap-1.5">
              {item.icon}
              <span className="text-xs font-semibold text-white">{item.label}</span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-tight">{item.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-auto px-3 py-3 border-t border-zinc-800">
        <p className="text-[10px] text-zinc-600 leading-tight">Drag nodes onto the canvas</p>
      </div>
    </aside>
  );
}
