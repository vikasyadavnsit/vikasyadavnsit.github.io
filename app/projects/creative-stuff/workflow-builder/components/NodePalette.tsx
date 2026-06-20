"use client";
import { Zap, Globe, Shuffle, Bell, Code2, Brain, GitBranch, Clock } from 'lucide-react';

interface PaletteItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  border: string;
  bg: string;
  description: string;
}

const ITEMS: PaletteItem[] = [
  { type: 'trigger',   label: 'Trigger',   icon: <Zap       className="w-3.5 h-3.5 text-amber-300"   />, border: 'border-amber-500/40',   bg: 'bg-amber-500/10',   description: 'Start your workflow' },
  { type: 'http',      label: 'HTTP',      icon: <Globe     className="w-3.5 h-3.5 text-blue-300"    />, border: 'border-blue-500/40',    bg: 'bg-blue-500/10',    description: 'Make an HTTP request' },
  { type: 'transform', label: 'Transform', icon: <Shuffle   className="w-3.5 h-3.5 text-purple-300"  />, border: 'border-purple-500/40',  bg: 'bg-purple-500/10',  description: 'Filter or map data' },
  { type: 'notify',    label: 'Notify',    icon: <Bell      className="w-3.5 h-3.5 text-emerald-300" />, border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', description: 'Send a notification' },
  { type: 'code',      label: 'Code',      icon: <Code2     className="w-3.5 h-3.5 text-pink-300"    />, border: 'border-pink-500/40',    bg: 'bg-pink-500/10',    description: 'Run a JS snippet' },
  { type: 'llm',       label: 'LLM',       icon: <Brain     className="w-3.5 h-3.5 text-violet-300"  />, border: 'border-violet-500/40',  bg: 'bg-violet-500/10',  description: 'OpenAI / Anthropic / Ollama' },
  { type: 'condition', label: 'Condition', icon: <GitBranch className="w-3.5 h-3.5 text-orange-300"  />, border: 'border-orange-500/40',  bg: 'bg-orange-500/10',  description: 'Branch on a JS condition' },
  { type: 'delay',     label: 'Delay',     icon: <Clock     className="w-3.5 h-3.5 text-slate-300"   />, border: 'border-slate-500/40',   bg: 'bg-slate-500/10',   description: 'Wait N seconds' },
];

export function NodePalette() {
  function onDragStart(e: React.DragEvent, type: string) {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
      {ITEMS.map(item => (
        <div
          key={item.type}
          draggable
          onDragStart={e => onDragStart(e, item.type)}
          className={`flex flex-col gap-0.5 p-2 rounded-lg border cursor-grab active:cursor-grabbing select-none transition-all hover:brightness-125 ${item.border} ${item.bg}`}
        >
          <div className="flex items-center gap-1.5">
            {item.icon}
            <span className="text-[11px] font-semibold text-white">{item.label}</span>
          </div>
          <p className="text-[9px] text-zinc-400 leading-tight">{item.description}</p>
        </div>
      ))}
      <p className="text-[9px] text-zinc-600 text-center pt-1">Drag onto canvas</p>
    </div>
  );
}
