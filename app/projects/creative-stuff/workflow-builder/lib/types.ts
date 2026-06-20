export type NodeStatus = 'idle' | 'running' | 'success' | 'error';

export interface TriggerConfig {
  type: 'manual' | 'schedule';
  interval?: number;
  sampleData?: string;
}

export interface HttpConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers: { key: string; value: string }[];
  body: string;
  useInputAsBody: boolean;
}

export interface TransformConfig {
  operation: 'map' | 'filter' | 'extract' | 'custom';
  expression: string;
}

export interface NotifyConfig {
  channel: 'console' | 'slack' | 'email';
  webhookUrl?: string;
  template: string;
}

export interface CodeConfig {
  code: string;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'ollama';
  model: string;
  systemPrompt: string;
  temperature: number;
  apiKey: string;
  useInputAsMessage: boolean;
  userMessage: string;
}

export interface ConditionConfig {
  expression: string;
}

export interface DelayConfig {
  seconds: number;
}

export type NodeConfig = TriggerConfig | HttpConfig | TransformConfig | NotifyConfig | CodeConfig | LLMConfig | ConditionConfig | DelayConfig;

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  status?: NodeStatus;
  output?: unknown;
  error?: string;
  config: NodeConfig;
}

export interface LogEntry {
  id: string;
  nodeId: string;
  nodeLabel: string;
  type: 'info' | 'success' | 'error' | 'data';
  message: string;
  data?: unknown;
  timestamp: Date;
}

export interface SavedWorkflow {
  id: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  savedAt: string;
}
