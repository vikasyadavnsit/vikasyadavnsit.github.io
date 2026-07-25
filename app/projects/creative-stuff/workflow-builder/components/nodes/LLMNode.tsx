"use client";
import { Brain } from 'lucide-react';
import type { NodeProps, Node } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import type { FlowNodeData, LLMConfig } from '../../lib/types';

export function LLMNode({ id, data, selected }: NodeProps<Node<FlowNodeData>>) {
  const d = data as unknown as FlowNodeData;
  const cfg = d.config as LLMConfig;
  return (
    <BaseNode
      id={id}
      label={d.label}
      subtitle={`${cfg.provider ?? 'openai'} / ${cfg.model || 'gpt-4o-mini'}`}
      icon={<Brain className="w-3.5 h-3.5 text-violet-300" />}
      borderColor="border-l-violet-500"
      iconBg="bg-violet-500/20"
      status={d.status}
      selected={selected}
    >
      <span className="truncate block text-zinc-400">
        {cfg.systemPrompt?.slice(0, 38) || <span className="text-zinc-600">no system prompt</span>}
      </span>
    </BaseNode>
  );
}
