import type { SavedWorkflow } from './types';

const KEY = 'wfb_saves';

export function listWorkflows(): SavedWorkflow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list: SavedWorkflow[] = raw ? JSON.parse(raw) : [];
    return list.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch {
    return [];
  }
}

export function saveWorkflow(name: string, nodes: unknown[], edges: unknown[]): SavedWorkflow {
  const list = listWorkflows();
  const existingIdx = list.findIndex(w => w.name === name);
  const workflow: SavedWorkflow = {
    id: existingIdx >= 0 ? list[existingIdx].id : crypto.randomUUID(),
    name,
    nodes,
    edges,
    savedAt: new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    list[existingIdx] = workflow;
  } else {
    list.unshift(workflow);
  }
  localStorage.setItem(KEY, JSON.stringify(list));
  return workflow;
}

export function deleteWorkflow(id: string): void {
  const list = listWorkflows().filter(w => w.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

const ACTIVE_KEY = 'wfb_active';

export interface ActiveWorkflow {
  name: string;
  nodes: unknown[];
  edges: unknown[];
}

export function getActiveWorkflow(): ActiveWorkflow | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) ?? 'null'); } catch { return null; }
}

export function setActiveWorkflow(name: string, nodes: unknown[], edges: unknown[]): void {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify({ name, nodes, edges }));
}
