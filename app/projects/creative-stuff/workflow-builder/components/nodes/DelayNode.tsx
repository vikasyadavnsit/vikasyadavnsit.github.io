"use client";
import { Clock } from 'lucide-react';
import type { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import type { FlowNodeData, DelayConfig } from '../../lib/types';

export function DelayNode({ id, data, selected }: NodeProps<Node<FlowNodeData>>) {
  const d = data as unknown as FlowNodeData;
  const cfg = d.config as DelayConfig;
  return (
    <BaseNode
      id={id}
      label={d.label}
      subtitle={`${cfg.seconds ?? 1}s pause`}
      icon={<Clock className="w-3.5 h-3.5 text-slate-300" />}
      borderColor="border-l-slate-400"
      iconBg="bg-slate-500/20"
      status={d.status}
      selected={selected}
    >
      <span className="font-mono text-zinc-400">wait {cfg.seconds ?? 1} second{(cfg.seconds ?? 1) !== 1 ? 's' : ''}</span>
    </BaseNode>
  );
}
