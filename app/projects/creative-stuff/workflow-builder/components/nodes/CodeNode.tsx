"use client";
import { Code2 } from 'lucide-react';
import type { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import type { FlowNodeData, CodeConfig } from '../../lib/types';

export function CodeNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  const d = data as unknown as FlowNodeData;
  const cfg = d.config as CodeConfig;
  return (
    <BaseNode
      label={d.label}
      subtitle="JS snippet"
      icon={<Code2 className="w-3.5 h-3.5 text-pink-300" />}
      borderColor="border-l-pink-500"
      iconBg="bg-pink-500/20"
      status={d.status}
      selected={selected}
    >
      <span className="font-mono truncate block">{cfg.code?.trim()?.slice(0, 38) || <span className="text-zinc-500">no code</span>}</span>
    </BaseNode>
  );
}
