"use client";
import { GitBranch } from 'lucide-react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { FlowNodeData, ConditionConfig } from '../../lib/types';

const statusDot: Record<string, string> = {
  idle:    'bg-zinc-600',
  running: 'bg-yellow-400 animate-pulse',
  success: 'bg-emerald-400',
  error:   'bg-red-400',
};

export function ConditionNode({ id, data, selected }: NodeProps<Node<FlowNodeData>>) {
  const d = data as unknown as FlowNodeData;
  const cfg = d.config as ConditionConfig;
  const { deleteElements } = useReactFlow();

  return (
    <div className={cn(
      'relative min-w-[200px] rounded-xl bg-zinc-900 border border-zinc-700 shadow-xl transition-all duration-150',
      'border-l-[3px] border-l-orange-500',
      selected && 'ring-2 ring-white/20',
    )}>
      {selected && (
        <button
          onClick={e => { e.stopPropagation(); deleteElements({ nodes: [{ id }] }); }}
          title="Delete node"
          className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-400 hover:bg-red-500/20 hover:border-red-500 hover:text-red-400 flex items-center justify-center text-xs transition-all leading-none"
        >
          ×
        </button>
      )}

      <Handle type="target" position={Position.Top}
        className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-400 hover:!bg-zinc-300 transition-colors" />

      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 bg-orange-500/20">
          <GitBranch className="w-3.5 h-3.5 text-orange-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white truncate">{d.label}</div>
          <div className="text-[10px] text-zinc-400 truncate">if / else</div>
        </div>
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusDot[d.status ?? 'idle'])} />
      </div>

      <div className="px-3 pb-2 text-[10px] text-zinc-400 border-t border-zinc-800 pt-2 font-mono truncate">
        {cfg.expression?.trim() || <span className="text-zinc-600">no expression</span>}
      </div>

      <div className="flex justify-between px-3 pb-2 text-[9px] font-semibold">
        <span className="text-emerald-400">true ↓</span>
        <span className="text-red-400">↓ false</span>
      </div>

      <Handle id="true" type="source" position={Position.Bottom} style={{ left: '30%' }}
        className="!w-3 !h-3 !bg-emerald-600 !border-2 !border-emerald-400 hover:!bg-emerald-300 transition-colors" />
      <Handle id="false" type="source" position={Position.Bottom} style={{ left: '70%' }}
        className="!w-3 !h-3 !bg-red-600 !border-2 !border-red-400 hover:!bg-red-300 transition-colors" />
    </div>
  );
}
