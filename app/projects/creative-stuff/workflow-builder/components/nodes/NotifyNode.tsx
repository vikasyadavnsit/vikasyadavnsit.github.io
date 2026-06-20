"use client";
import { Bell } from 'lucide-react';
import type { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import type { FlowNodeData, NotifyConfig } from '../../lib/types';

export function NotifyNode({ id, data, selected }: NodeProps<Node<FlowNodeData>>) {
  const d = data as unknown as FlowNodeData;
  const cfg = d.config as NotifyConfig;
  return (
    <BaseNode
      id={id}
      label={d.label}
      subtitle={cfg.channel || 'console'}
      icon={<Bell className="w-3.5 h-3.5 text-emerald-300" />}
      borderColor="border-l-emerald-500"
      iconBg="bg-emerald-500/20"
      status={d.status}
      hasOutput={false}
      selected={selected}
    >
      <span className="truncate block">{cfg.template?.slice(0, 38) || <span className="text-zinc-500">no template</span>}</span>
    </BaseNode>
  );
}
