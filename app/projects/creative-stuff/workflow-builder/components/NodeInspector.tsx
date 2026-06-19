"use client";
import { X, Plus, Trash2 } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import type { FlowNodeData, TriggerConfig, HttpConfig, TransformConfig, NotifyConfig, CodeConfig } from '../lib/types';

interface Props {
  nodeId: string;
  onClose: () => void;
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">{children}</label>;
}

function Input({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 ${mono ? 'font-mono' : ''}`}
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Textarea({ value, onChange, placeholder, rows = 4, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; mono?: boolean }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none ${mono ? 'font-mono' : ''}`}
    />
  );
}

function TriggerInspector({ cfg, update }: { cfg: TriggerConfig; update: (c: TriggerConfig) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Trigger type</Label>
        <Select value={cfg.type} onChange={v => update({ ...cfg, type: v as TriggerConfig['type'] })} options={[{ value: 'manual', label: 'Manual' }, { value: 'schedule', label: 'Schedule' }]} />
      </div>
      {cfg.type === 'schedule' && (
        <div>
          <Label>Interval (seconds)</Label>
          <Input value={String(cfg.interval ?? 60)} onChange={v => update({ ...cfg, interval: parseInt(v) || 60 })} mono />
        </div>
      )}
      <div>
        <Label>Seed data (JSON)</Label>
        <Textarea value={cfg.sampleData ?? ''} onChange={v => update({ ...cfg, sampleData: v })} placeholder='{"key": "value"}' mono rows={5} />
      </div>
    </div>
  );
}

function HttpInspector({ cfg, update }: { cfg: HttpConfig; update: (c: HttpConfig) => void }) {
  function updateHeader(idx: number, field: 'key' | 'value', val: string) {
    const headers = [...(cfg.headers ?? [])];
    headers[idx] = { ...headers[idx], [field]: val };
    update({ ...cfg, headers });
  }
  function addHeader() { update({ ...cfg, headers: [...(cfg.headers ?? []), { key: '', value: '' }] }); }
  function removeHeader(idx: number) { update({ ...cfg, headers: cfg.headers.filter((_, i) => i !== idx) }); }

  return (
    <div className="space-y-3">
      <div>
        <Label>Method</Label>
        <Select value={cfg.method} onChange={v => update({ ...cfg, method: v as HttpConfig['method'] })} options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => ({ value: m, label: m }))} />
      </div>
      <div>
        <Label>URL</Label>
        <Input value={cfg.url} onChange={v => update({ ...cfg, url: v })} placeholder="https://api.example.com/endpoint" mono />
      </div>
      <div>
        <Label>Headers</Label>
        <div className="space-y-1">
          {(cfg.headers ?? []).map((h, i) => (
            <div key={i} className="flex gap-1">
              <input value={h.key} onChange={e => updateHeader(i, 'key', e.target.value)} placeholder="Key" className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono" />
              <input value={h.value} onChange={e => updateHeader(i, 'value', e.target.value)} placeholder="Value" className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono" />
              <button onClick={() => removeHeader(i)} className="text-zinc-500 hover:text-red-400 transition-colors p-1"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={addHeader} className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors mt-1">
            <Plus className="w-3 h-3" /> Add header
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="useInput" checked={cfg.useInputAsBody} onChange={e => update({ ...cfg, useInputAsBody: e.target.checked })} className="rounded" />
        <label htmlFor="useInput" className="text-xs text-zinc-400">Use upstream output as body</label>
      </div>
      {!cfg.useInputAsBody && (
        <div>
          <Label>Body (JSON)</Label>
          <Textarea value={cfg.body} onChange={v => update({ ...cfg, body: v })} placeholder='{"key": "value"}' mono rows={4} />
        </div>
      )}
    </div>
  );
}

function TransformInspector({ cfg, update }: { cfg: TransformConfig; update: (c: TransformConfig) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Operation</Label>
        <Select value={cfg.operation} onChange={v => update({ ...cfg, operation: v as TransformConfig['operation'] })} options={[{ value: 'custom', label: 'Custom' }, { value: 'map', label: 'Map' }, { value: 'filter', label: 'Filter' }, { value: 'extract', label: 'Extract field' }]} />
      </div>
      <div>
        <Label>Expression (JS)</Label>
        <Textarea value={cfg.expression} onChange={v => update({ ...cfg, expression: v })} placeholder="return { ...input, extra: true }" mono rows={6} />
        <p className="text-[10px] text-zinc-600 mt-1">Variable <code className="text-zinc-400">input</code> = upstream output</p>
      </div>
    </div>
  );
}

function NotifyInspector({ cfg, update }: { cfg: NotifyConfig; update: (c: NotifyConfig) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Channel</Label>
        <Select value={cfg.channel} onChange={v => update({ ...cfg, channel: v as NotifyConfig['channel'] })} options={[{ value: 'console', label: 'Console (log)' }, { value: 'slack', label: 'Slack webhook' }, { value: 'email', label: 'Email (mock)' }]} />
      </div>
      {cfg.channel === 'slack' && (
        <div>
          <Label>Slack webhook URL</Label>
          <Input value={cfg.webhookUrl ?? ''} onChange={v => update({ ...cfg, webhookUrl: v })} placeholder="https://hooks.slack.com/…" mono />
        </div>
      )}
      <div>
        <Label>Message template</Label>
        <Textarea value={cfg.template} onChange={v => update({ ...cfg, template: v })} placeholder="Event received: {{input}}" rows={4} />
        <p className="text-[10px] text-zinc-600 mt-1">Use <code className="text-zinc-400">{'{{input}}'}</code> for upstream data</p>
      </div>
    </div>
  );
}

function CodeInspector({ cfg, update }: { cfg: CodeConfig; update: (c: CodeConfig) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label>JavaScript code</Label>
        <Textarea value={cfg.code} onChange={v => update({ ...cfg, code: v })} placeholder={'// input = upstream data\nreturn { ...input, processed: true };'} mono rows={10} />
        <p className="text-[10px] text-zinc-600 mt-1">Use <code className="text-zinc-400">return</code> to pass data downstream</p>
      </div>
    </div>
  );
}

export function NodeInspector({ nodeId, onClose }: Props) {
  const { getNode, setNodes } = useReactFlow();
  const node = getNode(nodeId);
  if (!node) return null;

  const data = node.data as FlowNodeData;

  function updateConfig(config: FlowNodeData['config']) {
    setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, data: { ...n.data, config } } : n));
  }

  function updateLabel(label: string) {
    setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, data: { ...n.data, label } } : n));
  }

  return (
    <aside className="w-[268px] flex-shrink-0 border-l border-zinc-800 bg-zinc-950 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-3 border-b border-zinc-800">
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Inspector</p>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors"><X className="w-3.5 h-3.5" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <Label>Label</Label>
          <Input value={data.label} onChange={updateLabel} />
        </div>

        <div className="border-t border-zinc-800 pt-4">
          {node.type === 'trigger'   && <TriggerInspector   cfg={data.config as TriggerConfig}   update={updateConfig} />}
          {node.type === 'http'      && <HttpInspector      cfg={data.config as HttpConfig}      update={updateConfig} />}
          {node.type === 'transform' && <TransformInspector cfg={data.config as TransformConfig} update={updateConfig} />}
          {node.type === 'notify'    && <NotifyInspector    cfg={data.config as NotifyConfig}    update={updateConfig} />}
          {node.type === 'code'      && <CodeInspector      cfg={data.config as CodeConfig}      update={updateConfig} />}
        </div>

        {data.output !== undefined && (
          <div className="border-t border-zinc-800 pt-4">
            <Label>Last output</Label>
            <pre className="bg-zinc-900 rounded-md p-2 text-[10px] font-mono text-emerald-400 overflow-auto max-h-32 whitespace-pre-wrap break-all">
              {JSON.stringify(data.output, null, 2)}
            </pre>
          </div>
        )}

        {data.error && (
          <div className="border-t border-zinc-800 pt-4">
            <Label>Last error</Label>
            <pre className="bg-zinc-900 rounded-md p-2 text-[10px] font-mono text-red-400 overflow-auto max-h-24 whitespace-pre-wrap break-all">{data.error}</pre>
          </div>
        )}
      </div>
    </aside>
  );
}
