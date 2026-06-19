"use client";
import { Zap } from 'lucide-react';
import type { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import type { FlowNodeData, TriggerConfig } from '../../lib/types';

export function TriggerNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  const d = data as unknown as FlowNodeData;
  const cfg = d.config as TriggerConfig;
  const subtitle = cfg.type === 'schedule' ? `Every ${cfg.interval ?? 60}s` : 'Manual';
  return (
    <BaseNode
      label={d.label}
      subtitle={subtitle}
      icon={<Zap className="w-3.5 h-3.5 text-amber-300" />}
      borderColor="border-l-amber-500"
      iconBg="bg-amber-500/20"
      status={d.status}
      hasInput={false}
      selected={selected}
    >
      {cfg.sampleData?.trim() ? (
        <span className="font-mono truncate block">seed: {cfg.sampleData.slice(0, 28)}{cfg.sampleData.length > 28 ? '…' : ''}</span>
      ) : (
        <span className="text-zinc-500">no seed data</span>
      )}
    </BaseNode>
  );
}
