"use client";
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { NodeStatus } from '../../lib/types';

interface BaseNodeProps {
  label: string;
  icon: React.ReactNode;
  borderColor: string;
  iconBg: string;
  status?: NodeStatus;
  hasInput?: boolean;
  hasOutput?: boolean;
  selected?: boolean;
  children?: React.ReactNode;
  subtitle?: string;
}

const statusDot: Record<string, string> = {
  idle: 'bg-zinc-600',
  running: 'bg-yellow-400 animate-pulse',
  success: 'bg-emerald-400',
  error: 'bg-red-400',
};

export function BaseNode({
  label, icon, borderColor, iconBg, status = 'idle',
  hasInput = true, hasOutput = true, selected, children, subtitle,
}: BaseNodeProps) {
  return (
    <div className={cn(
      'relative min-w-[190px] rounded-xl bg-zinc-900 border border-zinc-700 shadow-xl transition-all duration-150',
      `border-l-[3px] ${borderColor}`,
      selected && 'ring-2 ring-white/20',
    )}>
      {hasInput && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-400 hover:!bg-zinc-300 transition-colors"
        />
      )}

      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
        <div className={cn('flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0', iconBg)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white truncate">{label}</div>
          {subtitle && <div className="text-[10px] text-zinc-400 truncate">{subtitle}</div>}
        </div>
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusDot[status] ?? statusDot.idle)} />
      </div>

      {children && (
        <div className="px-3 pb-3 text-[10px] text-zinc-400 border-t border-zinc-800 pt-2">
          {children}
        </div>
      )}

      {hasOutput && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-zinc-600 !border-2 !border-zinc-400 hover:!bg-zinc-300 transition-colors"
        />
      )}
    </div>
  );
}
