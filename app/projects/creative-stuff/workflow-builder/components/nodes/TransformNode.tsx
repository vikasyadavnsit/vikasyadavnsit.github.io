"use client";
import { Shuffle } from 'lucide-react';
import type { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import type { FlowNodeData, TransformConfig } from '../../lib/types';

export function TransformNode({ id, data, selected }: NodeProps<Node<FlowNodeData>>) {
  const d = data as unknown as FlowNodeData;
  const cfg = d.config as TransformConfig;
  return (
    <BaseNode
      id={id}
      label={d.label}
      subtitle={cfg.operation || 'custom'}
      icon={<Shuffle className="w-3.5 h-3.5 text-purple-300" />}
      borderColor="border-l-purple-500"
      iconBg="bg-purple-500/20"
      status={d.status}
      selected={selected}
    >
      <span className="font-mono truncate block">{cfg.expression?.trim()?.slice(0, 38) || <span className="text-zinc-500">no expression</span>}</span>
    </BaseNode>
  );
}
