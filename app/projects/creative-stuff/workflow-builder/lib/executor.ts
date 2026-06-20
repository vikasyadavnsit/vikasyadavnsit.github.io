import type { Node, Edge } from '@xyflow/react';
import type {
  FlowNodeData, LogEntry, NodeStatus,
  TriggerConfig, HttpConfig, TransformConfig, NotifyConfig, CodeConfig,
  LLMConfig, ConditionConfig, DelayConfig,
} from './types';

type OnLog = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
type OnNodeStatus = (nodeId: string, status: NodeStatus, output?: unknown, error?: string) => void;

function topologicalSort(nodes: Node<FlowNodeData>[], edges: Edge[]): string[] {
  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};

  for (const n of nodes) {
    inDegree[n.id] = 0;
    adj[n.id] = [];
  }
  for (const e of edges) {
    adj[e.source].push(e.target);
    inDegree[e.target] = (inDegree[e.target] || 0) + 1;
  }

  const queue = Object.entries(inDegree).filter(([, d]) => d === 0).map(([id]) => id);
  const result: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    for (const neighbor of adj[id] ?? []) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }
  return result;
}

async function runNode(node: Node<FlowNodeData>, inputs: unknown[]): Promise<unknown> {
  const input = inputs.length === 1 ? inputs[0] : inputs.length > 1 ? inputs : null;

  switch (node.type) {
    case 'trigger': {
      const tc = node.data.config as TriggerConfig;
      if (tc.sampleData?.trim()) {
        try { return JSON.parse(tc.sampleData); } catch { return tc.sampleData; }
      }
      return { triggered: true, timestamp: new Date().toISOString(), source: tc.type };
    }

    case 'http': {
      const hc = node.data.config as HttpConfig;
      if (!hc.url?.trim()) throw new Error('URL is required');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      for (const h of hc.headers ?? []) {
        if (h.key.trim()) headers[h.key] = h.value;
      }
      let bodyPayload: unknown = undefined;
      if (hc.useInputAsBody) {
        bodyPayload = input;
      } else if (hc.body?.trim()) {
        try { bodyPayload = JSON.parse(hc.body); } catch { bodyPayload = hc.body; }
      }
      const res = await fetch('/api/workflow-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: hc.method, url: hc.url, headers, body: bodyPayload }),
      });
      const data = await res.json().catch(() => res.text());
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
      return data;
    }

    case 'transform': {
      const tc = node.data.config as TransformConfig;
      const expr = tc.expression?.trim() || 'return input';
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('input', expr.includes('return') ? expr : `return ${expr}`);
        return fn(input);
      } catch (e) {
        throw new Error(`Transform error: ${(e as Error).message}`);
      }
    }

    case 'notify': {
      const nc = node.data.config as NotifyConfig;
      const message = (nc.template || '{{input}}').replace('{{input}}', JSON.stringify(input, null, 2));
      if (nc.channel === 'slack' && nc.webhookUrl?.trim()) {
        await fetch('/api/workflow-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'POST', url: nc.webhookUrl, headers: { 'Content-Type': 'application/json' }, body: { text: message } }),
        });
      }
      return { notified: true, channel: nc.channel, message };
    }

    case 'code': {
      const cc = node.data.config as CodeConfig;
      const code = cc.code?.trim() || 'return input';
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('input', code);
        return fn(input);
      } catch (e) {
        throw new Error(`Code error: ${(e as Error).message}`);
      }
    }

    case 'llm': {
      const lc = node.data.config as LLMConfig;
      const userMsg = lc.useInputAsMessage ? JSON.stringify(input, null, 2) : (lc.userMessage || '');
      const temp = lc.temperature ?? 0.7;

      if (lc.provider === 'ollama') {
        const res = await fetch('/api/workflow-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'POST',
            url: 'http://localhost:11434/api/chat',
            headers: { 'Content-Type': 'application/json' },
            body: {
              model: lc.model || 'llama3',
              stream: false,
              messages: [
                ...(lc.systemPrompt ? [{ role: 'system', content: lc.systemPrompt }] : []),
                { role: 'user', content: userMsg },
              ],
            },
          }),
        });
        const d = await res.json().catch(() => { throw new Error('Invalid Ollama response'); });
        return d.message?.content ?? d;
      }

      if (lc.provider === 'anthropic') {
        if (!lc.apiKey?.trim()) throw new Error('Anthropic API key required');
        const res = await fetch('/api/workflow-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'POST',
            url: 'https://api.anthropic.com/v1/messages',
            headers: {
              'x-api-key': lc.apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            body: {
              model: lc.model || 'claude-haiku-4-5-20251001',
              max_tokens: 1024,
              system: lc.systemPrompt || undefined,
              messages: [{ role: 'user', content: userMsg }],
            },
          }),
        });
        const d = await res.json().catch(() => { throw new Error('Invalid Anthropic response'); });
        if (d.error) throw new Error(d.error.message);
        return d.content?.[0]?.text ?? d;
      }

      // Default: OpenAI
      if (!lc.apiKey?.trim()) throw new Error('OpenAI API key required');
      const res = await fetch('/api/workflow-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'POST',
          url: 'https://api.openai.com/v1/chat/completions',
          headers: {
            Authorization: `Bearer ${lc.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: {
            model: lc.model || 'gpt-4o-mini',
            temperature: temp,
            messages: [
              ...(lc.systemPrompt ? [{ role: 'system', content: lc.systemPrompt }] : []),
              { role: 'user', content: userMsg },
            ],
          },
        }),
      });
      const d = await res.json().catch(() => { throw new Error('Invalid OpenAI response'); });
      if (d.error) throw new Error(d.error.message);
      return d.choices?.[0]?.message?.content ?? d;
    }

    case 'condition': {
      const cc = node.data.config as ConditionConfig;
      const expr = cc.expression?.trim() || 'false';
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('input', `return !!(${expr})`);
        const branch = fn(input) ? 'true' : 'false';
        return { _branch: branch, value: input };
      } catch (e) {
        throw new Error(`Condition error: ${(e as Error).message}`);
      }
    }

    case 'delay': {
      const dc = node.data.config as DelayConfig;
      const ms = Math.min((dc.seconds ?? 1) * 1000, 30_000);
      await new Promise(r => setTimeout(r, ms));
      return input;
    }

    default:
      return input;
  }
}

export async function executeWorkflow(
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
  onLog: OnLog,
  onNodeStatus: OnNodeStatus
): Promise<void> {
  const order = topologicalSort(nodes, edges);

  if (order.length === 0) {
    onLog({ nodeId: '', nodeLabel: 'System', type: 'error', message: 'No runnable nodes found (check for cycles)' });
    return;
  }

  const outputs = new Map<string, unknown>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  onLog({ nodeId: '', nodeLabel: 'System', type: 'info', message: `Starting workflow — ${order.length} node(s) queued` });

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const inputEdges = edges.filter(e => e.target === nodeId);

    // For condition nodes: only pass through edges whose sourceHandle matches the branch result
    const inputs = inputEdges.flatMap(e => {
      const upstream = outputs.get(e.source);
      const upstreamNode = nodeMap.get(e.source);
      if (upstreamNode?.type === 'condition' && upstream && typeof upstream === 'object') {
        const branchResult = (upstream as { _branch: string; value: unknown });
        if (e.sourceHandle && e.sourceHandle !== branchResult._branch) return [];
        return [branchResult.value];
      }
      return upstream !== undefined ? [upstream] : [];
    });

    onNodeStatus(nodeId, 'running');
    onLog({ nodeId, nodeLabel: node.data.label, type: 'info', message: `Running ${node.data.label}…` });

    await new Promise(r => setTimeout(r, 350));

    try {
      const result = await runNode(node, inputs);
      outputs.set(nodeId, result);
      onNodeStatus(nodeId, 'success', result);
      onLog({ nodeId, nodeLabel: node.data.label, type: 'success', message: `${node.data.label} → OK`, data: result });
    } catch (err) {
      const msg = (err as Error).message;
      onNodeStatus(nodeId, 'error', undefined, msg);
      onLog({ nodeId, nodeLabel: node.data.label, type: 'error', message: `${node.data.label} failed: ${msg}` });
      return;
    }
  }

  onLog({ nodeId: '', nodeLabel: 'System', type: 'success', message: `Workflow complete ✓` });
}
