"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  reconnectEdge,
  ReactFlowProvider,
  useReactFlow,
  type OnConnect,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Play, Save, Trash2, CheckCircle2, Loader2, X, Plus, Workflow, Layers, Menu } from 'lucide-react';

import { TriggerNode }   from './nodes/TriggerNode';
import { HttpNode }      from './nodes/HttpNode';
import { TransformNode } from './nodes/TransformNode';
import { NotifyNode }    from './nodes/NotifyNode';
import { CodeNode }      from './nodes/CodeNode';
import { LLMNode }       from './nodes/LLMNode';
import { ConditionNode } from './nodes/ConditionNode';
import { DelayNode }     from './nodes/DelayNode';
import { CustomEdge }    from './edges/CustomEdge';
import { NodePalette }   from './NodePalette';
import { NodeInspector } from './NodeInspector';
import { ExecutionLog }  from './ExecutionLog';

import { executeWorkflow } from '../lib/executor';
import { listWorkflows, saveWorkflow, deleteWorkflow, getActiveWorkflow, setActiveWorkflow } from '../lib/storage';
import type {
  FlowNodeData, LogEntry, NodeStatus,
  TriggerConfig, HttpConfig, TransformConfig, NotifyConfig, CodeConfig,
  LLMConfig, ConditionConfig, DelayConfig,
} from '../lib/types';
import { cn } from '@/lib/utils';

type FlowNode = Node<FlowNodeData>;

const NODE_TYPES = {
  trigger:   TriggerNode,
  http:      HttpNode,
  transform: TransformNode,
  notify:    NotifyNode,
  code:      CodeNode,
  llm:       LLMNode,
  condition: ConditionNode,
  delay:     DelayNode,
};

const EDGE_TYPES = { default: CustomEdge };

function defaultConfig(type: string): FlowNodeData['config'] {
  switch (type) {
    case 'trigger':   return { type: 'manual', sampleData: '{"user":"alice","amount":42}' } as TriggerConfig;
    case 'http':      return { method: 'GET', url: '', headers: [], body: '', useInputAsBody: false } as HttpConfig;
    case 'transform': return { operation: 'custom', expression: 'return { ...input, processed: true }' } as TransformConfig;
    case 'notify':    return { channel: 'console', template: 'Received: {{input}}' } as NotifyConfig;
    case 'code':      return { code: 'return { ...input, ts: Date.now() };' } as CodeConfig;
    case 'llm':       return { provider: 'openai', model: 'gpt-4o-mini', systemPrompt: 'You are a helpful assistant.', temperature: 0.7, apiKey: '', useInputAsMessage: true, userMessage: '' } as LLMConfig;
    case 'condition': return { expression: 'input.amount > 10' } as ConditionConfig;
    case 'delay':     return { seconds: 2 } as DelayConfig;
    default:          return { type: 'manual' } as TriggerConfig;
  }
}

function labelFor(type: string) {
  const map: Record<string, string> = {
    trigger: 'Trigger', http: 'HTTP Request', transform: 'Transform',
    notify: 'Notify', code: 'Code', llm: 'LLM', condition: 'Condition', delay: 'Delay',
  };
  return map[type] ?? type;
}

const STARTER_NODES: FlowNode[] = [
  { id: 'n1', type: 'trigger',   position: { x: 220, y: 60  }, data: { label: 'Trigger',   config: { type: 'manual', sampleData: '{"user":"alice","amount":42}' } as TriggerConfig } },
  { id: 'n2', type: 'transform', position: { x: 220, y: 200 }, data: { label: 'Transform',  config: { operation: 'custom', expression: 'return { ...input, doubled: input.amount * 2 }' } as TransformConfig } },
  { id: 'n3', type: 'notify',    position: { x: 220, y: 340 }, data: { label: 'Notify',     config: { channel: 'console', template: 'Result: {{input}}' } as NotifyConfig } },
];
const STARTER_EDGES: Edge[] = [
  { id: 'e1-2', source: 'n1', target: 'n2', type: 'default', animated: true },
  { id: 'e2-3', source: 'n2', target: 'n3', type: 'default', animated: true },
];

function startResize(
  e: React.MouseEvent,
  axis: 'x' | 'y',
  current: number,
  setter: (v: number) => void,
  min: number,
  max: number,
  invert = false,
) {
  e.preventDefault();
  const start = axis === 'x' ? e.clientX : e.clientY;
  const onMove = (ev: MouseEvent) => {
    const delta = (axis === 'x' ? ev.clientX : ev.clientY) - start;
    setter(Math.max(min, Math.min(max, current + (invert ? -delta : delta))));
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ─── inner builder ────────────────────────────────────────────────────────────
function Builder() {
  const { screenToFlowPosition } = useReactFlow();

  // Always start with starter state so server + client render identically,
  // then restore from localStorage after mount to avoid hydration mismatch.
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(STARTER_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(STARTER_EDGES);
  const [workflowName, setWorkflowName] = useState('My Workflow');

  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [isRunning, setIsRunning]     = useState(false);
  const [logOpen, setLogOpen]         = useState(true);
  const [log, setLog]                 = useState<LogEntry[]>([]);
  const [showSave, setShowSave]       = useState(false);
  const [saveMsg, setSaveMsg]         = useState('');
  const [savedList, setSavedList]     = useState<ReturnType<typeof listWorkflows>>([]);
  const [leftTab, setLeftTab]         = useState<'nodes' | 'flows'>('nodes');
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [leftOpen, setLeftOpen]             = useState(false);

  // Panel sizes
  const [leftWidth, setLeftWidth]     = useState(160);
  const [inspWidth, setInspWidth]     = useState(268);
  const [logHeight, setLogHeight]     = useState(176);

  const idCounter = useRef(100);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const edgeReconnectSuccessful = useRef(true);

  // Restore active workflow from localStorage after mount (avoids SSR/hydration mismatch)
  useEffect(() => {
    const activeWf = getActiveWorkflow();
    if (activeWf) {
      setNodes(activeWf.nodes as FlowNode[]);
      setEdges(activeWf.edges as Edge[]);
      setWorkflowName(activeWf.name);
    }
    setSavedList(listWorkflows());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save debounced
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      setActiveWorkflow(workflowName, nodes, edges);
    }, 400);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [nodes, edges, workflowName]);

  useEffect(() => {
    const check = () => setIsMobileLayout(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fan-out: does any source have >1 outgoing edge?
  const hasFanOut = edges.some(e => edges.filter(x => x.source === e.source).length > 1);

  const onConnect: OnConnect = useCallback(params => {
    setEdges(eds => {
      const existing = eds.filter(e => e.source === params.source);
      const newEdge: Edge = {
        ...params,
        id: `e-${crypto.randomUUID()}`,
        type: 'default',
        animated: true,
        source: params.source,
        target: params.target,
      };
      const updated = addEdge(newEdge, eds);
      // If fan-out, label all edges from this source with sequence numbers
      if (existing.length >= 1) {
        const fromSrc = updated.filter(e => e.source === params.source);
        return updated.map(e =>
          e.source === params.source
            ? { ...e, label: String(fromSrc.findIndex(s => s.id === e.id) + 1) }
            : e
        );
      }
      return updated;
    });
  }, [setEdges]);

  function addNode(type: string, position: { x: number; y: number }) {
    idCounter.current++;
    const newNode: FlowNode = {
      id: `n${idCounter.current}`,
      type,
      position,
      data: { label: labelFor(type), config: defaultConfig(type) },
    };
    setNodes(ns => [...ns, newNode]);
    setSelectedId(newNode.id);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow');
    if (!type) return;
    addNode(type, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function updateNodeStatus(nodeId: string, status: NodeStatus, output?: unknown, error?: string) {
    setNodes(ns => ns.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, status, output, error } } : n
    ));
  }

  function addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    setLog(prev => [...prev, { ...entry, id: crypto.randomUUID(), timestamp: new Date() }]);
  }

  async function run() {
    setIsRunning(true);
    setLogOpen(true);
    setLog([]);
    setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, status: 'idle' as NodeStatus, output: undefined, error: undefined } })));
    await executeWorkflow(nodes, edges, addLog, updateNodeStatus);
    setIsRunning(false);
  }

  function newWorkflow() {
    setNodes([]);
    setEdges([]);
    setSelectedId(null);
    setLog([]);
    setWorkflowName('Untitled Workflow');
  }

  function handleSave() {
    saveWorkflow(workflowName, nodes, edges);
    setSavedList(listWorkflows());
    setSaveMsg('Saved!');
    setTimeout(() => { setSaveMsg(''); setShowSave(false); }, 1200);
  }

  function handleLoad(wf: ReturnType<typeof listWorkflows>[0]) {
    setNodes(wf.nodes as FlowNode[]);
    setEdges(wf.edges as Edge[]);
    setWorkflowName(wf.name);
    setSelectedId(null);
    setLog([]);
  }

  function handleDeleteWf(id: string) {
    deleteWorkflow(id);
    setSavedList(listWorkflows());
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 h-11 border-b border-zinc-800 bg-zinc-950 flex-shrink-0">
        <input
          value={workflowName}
          onChange={e => setWorkflowName(e.target.value)}
          className="bg-transparent border-b border-zinc-700 text-sm font-semibold text-white focus:outline-none focus:border-zinc-400 px-1 py-0.5 w-44 transition-colors"
        />
        {hasFanOut && (
          <span className="text-[10px] text-zinc-500 border border-zinc-700 rounded px-2 py-0.5">
            ⑂ multiple outputs run in parallel
          </span>
        )}
        <button
          onClick={() => setLeftOpen(v => !v)}
          className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 text-xs font-semibold hover:border-zinc-500 hover:text-white transition-all flex-shrink-0"
          title="Toggle node panel"
        >
          {leftOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-zinc-600 hidden md:block">Select node → Del to delete</span>
        <button
          onClick={newWorkflow}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 text-xs font-semibold hover:border-zinc-500 hover:text-white transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> New
        </button>
        <button
          onClick={run}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition-all disabled:opacity-50"
        >
          {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {isRunning ? 'Running…' : 'Run'}
        </button>
        <button
          onClick={() => setShowSave(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 text-xs font-semibold hover:border-zinc-500 hover:text-white transition-all"
        >
          <Save className="w-3.5 h-3.5" /> Save
        </button>
      </div>

      {/* Main area */}
      <div className="relative flex flex-1 min-h-0">
        {/* Left panel */}
        <aside
          style={isMobileLayout ? undefined : { width: leftWidth }}
          className={cn(
            "border-r border-zinc-800 bg-zinc-950 flex flex-col overflow-hidden",
            isMobileLayout
              ? cn("absolute inset-y-0 left-0 z-20 w-64 flex-shrink-0", !leftOpen && "hidden")
              : "flex-shrink-0"
          )}
        >
          <div className="flex border-b border-zinc-800 flex-shrink-0">
            <button
              onClick={() => setLeftTab('nodes')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-semibold uppercase tracking-widest transition-colors',
                leftTab === 'nodes' ? 'text-white border-b-2 border-emerald-500' : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              <Layers className="w-3 h-3" /> Nodes
            </button>
            <button
              onClick={() => { setLeftTab('flows'); setSavedList(listWorkflows()); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-semibold uppercase tracking-widest transition-colors',
                leftTab === 'flows' ? 'text-white border-b-2 border-emerald-500' : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              <Workflow className="w-3 h-3" /> Flows
            </button>
          </div>

          {leftTab === 'nodes' ? (
            <NodePalette />
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-2 flex-shrink-0">
                <button
                  onClick={newWorkflow}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-dashed border-zinc-700 text-zinc-400 text-[11px] font-semibold hover:border-zinc-500 hover:text-white transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> New Workflow
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 min-h-0">
                {savedList.length === 0 ? (
                  <p className="text-[10px] text-zinc-600 text-center pt-4 px-2">No saved workflows.<br />Click Save to store one.</p>
                ) : (
                  savedList.map(wf => (
                    <div
                      key={wf.id}
                      className={cn(
                        'rounded-lg border p-2 cursor-pointer transition-all group',
                        wf.name === workflowName
                          ? 'border-emerald-500/50 bg-emerald-500/10 border-l-2 border-l-emerald-500'
                          : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/50',
                      )}
                      onClick={() => handleLoad(wf)}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-white truncate">{wf.name}</p>
                          <p className="text-[9px] text-zinc-500">{new Date(wf.savedAt).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteWf(wf.id); }}
                          className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0 pt-0.5 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Left resize handle (desktop only) */}
        {!isMobileLayout && (
          <div
            className="w-1 flex-shrink-0 cursor-col-resize hover:bg-emerald-500/40 active:bg-emerald-500/60 transition-colors bg-zinc-800/50"
            onMouseDown={e => startResize(e, 'x', leftWidth, setLeftWidth, 120, 340)}
          />
        )}

        {/* Mobile left panel backdrop */}
        {isMobileLayout && leftOpen && (
          <div
            className="fixed inset-0 z-[19] bg-black/50"
            onClick={() => setLeftOpen(false)}
          />
        )}

        {/* Canvas */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex-1 relative min-h-0" onDrop={onDrop} onDragOver={onDragOver}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              onPaneClick={() => setSelectedId(null)}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              deleteKeyCode="Delete"
              style={{ background: '#09090b' }}
              edgesReconnectable
              onReconnectStart={() => { edgeReconnectSuccessful.current = false; }}
              onReconnect={(oldEdge, newConn) => {
                edgeReconnectSuccessful.current = true;
                setEdges(es => reconnectEdge(oldEdge, newConn, es));
              }}
              onReconnectEnd={(_, edge) => {
                if (!edgeReconnectSuccessful.current)
                  setEdges(es => es.filter(e => e.id !== edge.id));
              }}
            >
              <Background variant={BackgroundVariant.Dots} color="#27272a" gap={20} size={1} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>

          <ExecutionLog
            entries={log}
            onClear={() => setLog([])}
            isOpen={logOpen}
            onToggle={() => setLogOpen(v => !v)}
            height={logHeight}
            onResizeStart={e => startResize(e, 'y', logHeight, setLogHeight, 80, 500, true)}
          />
        </div>

        {/* Right inspector with resize handle */}
        {selectedId && (
          <>
            {/* Desktop resize handle */}
            {!isMobileLayout && (
              <div
                className="w-1 flex-shrink-0 cursor-col-resize hover:bg-emerald-500/40 active:bg-emerald-500/60 transition-colors bg-zinc-800/50"
                onMouseDown={e => startResize(e, 'x', inspWidth, setInspWidth, 200, 420, true)}
              />
            )}
            {/* Mobile backdrop */}
            {isMobileLayout && (
              <div
                className="fixed inset-0 z-[19] bg-black/50"
                onClick={() => setSelectedId(null)}
              />
            )}
            <div
              className={isMobileLayout
                ? "absolute inset-y-0 right-0 z-20 w-[85vw] max-w-[300px] flex flex-col"
                : "contents"
              }
            >
              <NodeInspector
                nodeId={selectedId}
                width={isMobileLayout ? undefined : inspWidth}
                onClose={() => setSelectedId(null)}
              />
            </div>
          </>
        )}
      </div>

      {/* Save modal */}
      {showSave && (
        <Modal title="Save Workflow" onClose={() => setShowSave(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Workflow name</label>
              <input
                value={workflowName}
                onChange={e => setWorkflowName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              />
            </div>
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/30 transition-all"
            >
              {saveMsg
                ? <><CheckCircle2 className="w-4 h-4" /> {saveMsg}</>
                : <><Save className="w-4 h-4" /> Save</>}
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        .react-flow__controls { background: #18181b !important; border: 1px solid #27272a !important; border-radius: 8px !important; overflow: hidden; }
        .react-flow__controls-button { background: #18181b !important; border: none !important; border-bottom: 1px solid #27272a !important; color: #a1a1aa !important; }
        .react-flow__controls-button:hover { background: #27272a !important; color: #fff !important; }
        .react-flow__connection-path { stroke: #6366f1 !important; stroke-width: 2 !important; }
        .react-flow__attribution { display: none !important; }
        .react-flow__edge-interaction { stroke-width: 20px !important; cursor: pointer; }
      `}</style>
    </div>
  );
}

function Modal({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <Builder />
    </ReactFlowProvider>
  );
}
