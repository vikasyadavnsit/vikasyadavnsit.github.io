"use client";
import { Globe } from 'lucide-react';
import type { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import type { FlowNodeData, HttpConfig } from '../../lib/types';

export function HttpNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  const d = data as unknown as FlowNodeData;
  const cfg = d.config as HttpConfig;
  return (
    <BaseNode
      label={d.label}
      subtitle={cfg.method || 'GET'}
      icon={<Globe className="w-3.5 h-3.5 text-blue-300" />}
      borderColor="border-l-blue-500"
      iconBg="bg-blue-500/20"
      status={d.status}
      selected={selected}
    >
      <span className="font-mono truncate block">{cfg.url?.trim() || <span className="text-zinc-500">no url set</span>}</span>
    </BaseNode>
  );
}
