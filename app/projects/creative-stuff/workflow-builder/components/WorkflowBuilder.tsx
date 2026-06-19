"use client";
import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
  type OnConnect,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Play, Save, FolderOpen, Trash2, CheckCircle2, Loader2, X } from 'lucide-react';

import { TriggerNode }   from './nodes/TriggerNode';
import { HttpNode }      from './nodes/HttpNode';
import { TransformNode } from './nodes/TransformNode';
import { NotifyNode }    from './nodes/NotifyNode';
import { CodeNode }      from './nodes/CodeNode';
import { NodePalette }   from './NodePalette';
import { NodeInspector } from './NodeInspector';
import { ExecutionLog }  from './ExecutionLog';

import { executeWorkflow } from '../lib/executor';
import { listWorkflows, saveWorkflow, deleteWorkflow } from '../lib/storage';
import type { FlowNodeData, LogEntry, NodeStatus, TriggerConfig, HttpConfig, TransformConfig, NotifyConfig, CodeConfig } from '../lib/types';

type FlowNode = Node<FlowNodeData>;

const NODE_TYPES = {
  trigger:   TriggerNode,
  http:      HttpNode,
  transform: TransformNode,
  notify:    NotifyNode,
  code:      CodeNode,
};

function defaultConfig(type: string): FlowNodeData['config'] {
  switch (type) {
    case 'trigger':   return { type: 'manual', sampleData: '{"user":"alice","amount":42}' } as TriggerConfig;
    case 'http':      return { method: 'GET', url: '', headers: [], body: '', useInputAsBody: false } as HttpConfig;
    case 'transform': return { operation: 'custom', expression: 'return { ...input, processed: true }' } as TransformConfig;
    case 'notify':    return { channel: 'console', template: 'Received: {{input}}' } as NotifyConfig;
    case 'code':      return { code: 'return { ...input, ts: Date.now() };' } as CodeConfig;
    default:          return { type: 'manual' } as TriggerConfig;
  }
}

function labelFor(type: string) {
  const map: Record<string, string> = { trigger: 'Trigger', http: 'HTTP Request', transform: 'Transform', notify: 'Notify', code: 'Code' };
  return map[type] ?? type;
}

const STARTER_NODES: FlowNode[] = [
  { id: 'n1', type: 'trigger',   position: { x: 220, y: 60  }, data: { label: 'Trigger',   config: { type: 'manual', sampleData: '{"user":"alice","amount":42}' } as TriggerConfig } },
  { id: 'n2', type: 'transform', position: { x: 220, y: 200 }, data: { label: 'Transform',  config: { operation: 'custom', expression: 'return { ...input, doubled: input.amount * 2 }' } as TransformConfig } },
  { id: 'n3', type: 'notify',    position: { x: 220, y: 340 }, data: { label: 'Notify',     config: { channel: 'console', template: 'Result: {{input}}' } as NotifyConfig } },
];
const STARTER_EDGES: Edge[] = [
  { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
  { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
];

function Builder() {
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(STARTER_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(STARTER_EDGES);

  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('My Workflow');
  const [isRunning, setIsRunning]       = useState(false);
  const [logOpen, setLogOpen]           = useState(true);
  const [log, setLog]                   = useState<LogEntry[]>([]);
  const [showSave, setShowSave]         = useState(false);
  const [showLoad, setShowLoad]         = useState(false);
  const [savedList, setSavedList]       = useState(() => listWorkflows());
  const [saveMsg, setSaveMsg]           = useState('');

  const idCounter = useRef(100);

  const onConnect: OnConnect = useCallback(
    params => setEdges(eds => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

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
    setShowLoad(false);
  }

  function handleDelete(id: string) {
    deleteWorkflow(id);
    setSavedList(listWorkflows());
  }

  function clearCanvas() {
    setNodes([]);
    setEdges([]);
    setSelectedId(null);
    setLog([]);
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
        <div className="flex-1" />
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
        <button
          onClick={() => { setSavedList(listWorkflows()); setShowLoad(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 text-xs font-semibold hover:border-zinc-500 hover:text-white transition-all"
        >
          <FolderOpen className="w-3.5 h-3.5" /> Load
        </button>
        <button
          onClick={clearCanvas}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-500 text-xs font-semibold hover:border-red-500/40 hover:text-red-400 transition-all"
          title="Clear canvas"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        <NodePalette />

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex-1 relative" onDrop={onDrop} onDragOver={onDragOver}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={NODE_TYPES}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              onPaneClick={() => setSelectedId(null)}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              deleteKeyCode="Delete"
              style={{ background: '#09090b' }}
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
          />
        </div>

        {selectedId && (
          <NodeInspector nodeId={selectedId} onClose={() => setSelectedId(null)} />
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

      {/* Load modal */}
      {showLoad && (
        <Modal title="Load Workflow" onClose={() => setShowLoad(false)}>
          {savedList.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No saved workflows yet.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {savedList.map(wf => (
                <div key={wf.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-500 transition-all">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{wf.name}</p>
                    <p className="text-[10px] text-zinc-500">{new Date(wf.savedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleLoad(wf)}
                      className="text-xs px-3 py-1 rounded bg-zinc-700 text-white hover:bg-zinc-600 transition-colors flex items-center gap-1"
                    >
                      <FolderOpen className="w-3 h-3" /> Load
                    </button>
                    <button onClick={() => handleDelete(wf.id)} className="text-zinc-500 hover:text-red-400 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      <style>{`
        .react-flow__controls { background: #18181b !important; border: 1px solid #27272a !important; border-radius: 8px !important; overflow: hidden; }
        .react-flow__controls-button { background: #18181b !important; border: none !important; border-bottom: 1px solid #27272a !important; color: #a1a1aa !important; }
        .react-flow__controls-button:hover { background: #27272a !important; color: #fff !important; }
        .react-flow__edge-path { stroke: #3f3f46 !important; stroke-width: 2 !important; }
        .react-flow__edge.animated .react-flow__edge-path { stroke-dasharray: 5 !important; animation: dashdraw 0.5s linear infinite !important; }
        .react-flow__connection-path { stroke: #6366f1 !important; }
        .react-flow__attribution { display: none !important; }
        @keyframes dashdraw { to { stroke-dashoffset: -10; } }
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
