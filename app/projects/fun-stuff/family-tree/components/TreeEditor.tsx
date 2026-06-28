'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, UserPlus, Download, Share2, FileJson, Minus, Plus, Heart,
  Edit3, Trash2, GitMerge, GitBranch, User, X, Check, Maximize2,
} from 'lucide-react';
import type { FamilyTree, Member, Relationship, ActiveModal, LayoutEdge } from '../types';
import { NODE_WIDTH, NODE_HEIGHT } from '../types';
import { computeLayout } from '../lib/tree-layout';
import { getTree, saveTree, updateMember, deleteMember, addRelationship, deleteRelationship } from '../lib/storage';
import { encodeShareHash, exportTreeAsJSON } from '../lib/share';
import TreeCanvas from './TreeCanvas';
import MemberForm from './MemberForm';
import RelationshipPanel from './RelationshipPanel';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface Props {
  treeId: string;
  onBack: () => void;
  onTreeUpdated: (tree: FamilyTree) => void;
}

export default function TreeEditor({ treeId, onBack, onTreeUpdated }: Props) {
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [modal, setModal] = useState<ActiveModal>({ kind: 'none' });
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [toast, setToast] = useState('');
  const [downloading, setDownloading] = useState(false);

  const [nodeOffsets, setNodeOffsets] = useState<Record<string, { x: number; y: number }>>({});

  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const captureRef = useRef<HTMLDivElement>(null);
  const hasAutoFitted = useRef(false);
  const zoomRef = useRef(1);
  const draggingRef = useRef<{
    memberId: string;
    startMouseX: number;
    startMouseY: number;
    startOffX: number;
    startOffY: number;
  } | null>(null);

  // Keep zoomRef in sync with zoom state for use inside event handler closures
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  useEffect(() => {
    const t = getTree(treeId);
    if (t) setTree(t);
  }, [treeId]);

  const layout = useMemo(() => {
    if (!tree) return null;
    return computeLayout(tree);
  }, [tree]);

  // Apply per-node drag offsets on top of the computed layout, updating edge endpoints too
  const displayLayout = useMemo(() => {
    if (!layout || !tree) return layout;
    const hasOffsets = Object.keys(nodeOffsets).length > 0;
    if (!hasOffsets) return layout;

    const adjusted = new Map(
      layout.nodes.map(n => [
        n.memberId,
        { x: n.x + (nodeOffsets[n.memberId]?.x ?? 0), y: n.y + (nodeOffsets[n.memberId]?.y ?? 0) },
      ])
    );

    const edges: LayoutEdge[] = [];
    for (const rel of tree.relationships) {
      if (rel.type === 'parent-child' && rel.parentId && rel.childId) {
        const from = adjusted.get(rel.parentId);
        const to = adjusted.get(rel.childId);
        if (from && to) {
          edges.push({ fromX: from.x, fromY: from.y + NODE_HEIGHT / 2, toX: to.x, toY: to.y - NODE_HEIGHT / 2, type: 'parent-child' });
        }
      } else if (rel.type === 'spouse' && rel.member1Id && rel.member2Id) {
        const a = adjusted.get(rel.member1Id);
        const b = adjusted.get(rel.member2Id);
        if (a && b) {
          const left = a.x < b.x ? a : b;
          const right = a.x < b.x ? b : a;
          edges.push({ fromX: left.x + NODE_WIDTH / 2, fromY: left.y, toX: right.x - NODE_WIDTH / 2, toY: right.y, type: 'spouse' });
        }
      }
    }

    const nodes = layout.nodes.map(n => ({
      ...n,
      x: adjusted.get(n.memberId)?.x ?? n.x,
      y: adjusted.get(n.memberId)?.y ?? n.y,
    }));

    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    return {
      nodes,
      edges,
      totalWidth: Math.max(...xs) + NODE_WIDTH / 2 + 40,
      totalHeight: Math.max(...ys) + NODE_HEIGHT / 2 + 40,
    };
  }, [layout, nodeOffsets, tree]);

  // Auto-fit once on first layout load
  useEffect(() => {
    if (!layout || hasAutoFitted.current) return;
    requestAnimationFrame(() => {
      fitToScreen();
      hasAutoFitted.current = true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  function fitToScreen(resetOffsets = false) {
    const target = displayLayout ?? layout;
    if (!target || !canvasWrapRef.current) return;
    if (resetOffsets) setNodeOffsets({});
    const { clientWidth: cw, clientHeight: ch } = canvasWrapRef.current;
    const PAD = 48;
    const scaleX = (cw - PAD * 2) / target.totalWidth;
    const scaleY = (ch - PAD * 2) / target.totalHeight;
    const newZoom = Math.min(scaleX, scaleY, 1.2);
    const newPanX = (cw - target.totalWidth * newZoom) / 2;
    const newPanY = Math.max(PAD, (ch - target.totalHeight * newZoom) / 2);
    setZoom(parseFloat(newZoom.toFixed(2)));
    setPan({ x: newPanX, y: newPanY });
  }

  function applyUpdate(updated: FamilyTree) {
    setTree(updated);
    onTreeUpdated(updated);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  // Node drag start — called from TreeCanvas foreignObject onMouseDown
  function handleNodeDragStart(memberId: string, e: React.MouseEvent) {
    const cur = nodeOffsets[memberId] ?? { x: 0, y: 0 };
    draggingRef.current = {
      memberId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startOffX: cur.x,
      startOffY: cur.y,
    };
  }

  // Pan handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-member-node]')) return;
    isPanning.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      // Node drag takes priority over pan
      if (draggingRef.current) {
        const { memberId, startMouseX, startMouseY, startOffX, startOffY } = draggingRef.current;
        const dx = (e.clientX - startMouseX) / zoomRef.current;
        const dy = (e.clientY - startMouseY) / zoomRef.current;
        setNodeOffsets(prev => ({ ...prev, [memberId]: { x: startOffX + dx, y: startOffY + dy } }));
        return;
      }
      if (!isPanning.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    }
    function onMouseUp() { isPanning.current = false; draggingRef.current = null; }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setZoom((z) => Math.min(2, Math.max(0.3, z + delta)));
  }

  // Member actions
  function handleSaveMember(m: Member) {
    if (!tree) return;
    updateMember(tree.id, m);
    const updated = getTree(tree.id)!;
    applyUpdate(updated);
    setModal({ kind: 'none' });
    if (modal.kind === 'add-member') setSelectedMemberId(m.id);
  }

  function handleDeleteMember(memberId: string) {
    if (!tree) return;
    deleteMember(tree.id, memberId);
    const updated = getTree(tree.id)!;
    applyUpdate(updated);
    setSelectedMemberId(null);
    setModal({ kind: 'none' });
  }

  function handleAddRelationship(rel: Relationship) {
    if (!tree) return;
    addRelationship(tree.id, rel);
    const updated = getTree(tree.id)!;
    applyUpdate(updated);
    setModal({ kind: 'none' });
  }

  function handleDeleteRelationship(relId: string) {
    if (!tree) return;
    deleteRelationship(tree.id, relId);
    const updated = getTree(tree.id)!;
    applyUpdate(updated);
  }

  async function handleDownloadPng() {
    if (!captureRef.current || !tree) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      const safeName = tree.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      a.download = `${safeName}-family-tree.png`;
      a.click();
      showToast('Image downloaded!');
    } catch {
      showToast('Failed to capture image.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    if (!tree) return;
    try {
      const hash = await encodeShareHash(tree);
      const url = `${window.location.origin}${window.location.pathname}#${hash}`;
      await navigator.clipboard.writeText(url);
      showToast('Share link copied to clipboard!');
    } catch {
      showToast('Could not copy to clipboard.');
    }
  }

  function handleExportJSON() {
    if (!tree) return;
    exportTreeAsJSON(tree);
  }

  const selectedMember = tree?.members.find((m) => m.id === selectedMemberId) ?? null;

  if (!tree || !layout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="w-px h-5 bg-zinc-700" />

        <h2 className="font-semibold text-white truncate max-w-[160px] sm:max-w-xs">{tree.name}</h2>
        <span className="text-zinc-500 text-xs hidden sm:inline">{tree.members.length} members</span>

        <div className="flex-1" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg px-1 py-0.5">
          <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} className="p-1 text-zinc-400 hover:text-white">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-zinc-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} className="p-1 text-zinc-400 hover:text-white">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() => fitToScreen()}
          className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          title="Fit tree to screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => setModal({ kind: 'add-member' })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Member</span>
        </button>

        <button
          onClick={handleDownloadPng}
          disabled={downloading}
          className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          title="Download PNG"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={handleShare}
          className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          title="Share"
        >
          <Share2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleExportJSON}
          className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          title="Export JSON"
        >
          <FileJson className="w-4 h-4" />
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div
          ref={canvasWrapRef}
          className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={onMouseDown}
          onWheel={onWheel}
          style={{ userSelect: 'none' }}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              display: 'inline-block',
            }}
          >
            <div ref={captureRef} style={{ padding: 20, background: '#0a0a0a', borderRadius: 16 }}>
              <div data-tree-canvas>
                <TreeCanvas
                  layout={displayLayout ?? layout}
                  members={tree.members}
                  relationships={tree.relationships}
                  selectedMemberId={selectedMemberId}
                  onSelectMember={(id) => setSelectedMemberId((prev) => (prev === id ? null : id))}
                  onNodeDragStart={handleNodeDragStart}
                />
              </div>
            </div>
          </div>

          {/* Canvas analytics overlay */}
          {tree.members.length > 0 && (() => {
            const generations = layout ? new Set(layout.nodes.map(n => n.generation)).size : 0;
            const couples = tree.relationships.filter(r => r.type === 'spouse').length;
            const living = tree.members.filter(m => !m.dateOfDeath).length;
            const deceased = tree.members.length - living;
            return (
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                <div className="flex flex-wrap gap-1.5">
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900/85 border border-zinc-700/60 text-[10px] font-semibold text-zinc-300 backdrop-blur-sm shadow">
                    <svg className="w-3 h-3 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    {tree.members.length} Members
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900/85 border border-zinc-700/60 text-[10px] font-semibold text-zinc-300 backdrop-blur-sm shadow">
                    <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20" strokeLinecap="round"/></svg>
                    {generations} Gen{generations !== 1 ? 's' : ''}
                  </span>
                  {couples > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900/85 border border-zinc-700/60 text-[10px] font-semibold text-zinc-300 backdrop-blur-sm shadow">
                      <svg className="w-3 h-3 text-pink-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.4C10.6 20.1 3 14.5 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-7.6 11.1-9 12.4Z"/></svg>
                      {couples} Couple{couples !== 1 ? 's' : ''}
                    </span>
                  )}
                  {living > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900/85 border border-zinc-700/60 text-[10px] font-semibold text-emerald-400 backdrop-blur-sm shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      {living} Living
                    </span>
                  )}
                  {deceased > 0 && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900/85 border border-zinc-700/60 text-[10px] font-semibold text-zinc-500 backdrop-blur-sm shadow">
                      † {deceased} Deceased
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <svg width="20" height="8"><path d="M 0 4 C 5 4, 15 4, 20 4" stroke="#6366f1" strokeWidth="2" fill="none" /></svg>
              Parent-Child
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3 2" /></svg>
              Spouse
            </span>
          </div>

          {/* Floating fit / reset buttons */}
          {tree.members.length > 0 && (
            <div className="absolute bottom-14 right-4 flex flex-col gap-2 items-end">
              <button
                onClick={() => fitToScreen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/90 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 text-xs font-medium transition-all shadow-lg backdrop-blur-sm"
                title="Reset node positions and fit to screen"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Reset layout
              </button>
              <button
                onClick={() => fitToScreen()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/90 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 text-xs font-medium transition-all shadow-lg backdrop-blur-sm"
                title="Fit tree to screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Fit to screen
              </button>
            </div>
          )}

          {/* Hint */}
          {tree.members.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-zinc-600 text-sm">Click &quot;Add Member&quot; to start building your tree</p>
            </div>
          )}
        </div>

        {/* Right sidebar - selected member */}
        <AnimatePresence>
          {selectedMember && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-64 flex-shrink-0 border-l border-zinc-800 bg-zinc-900/80 backdrop-blur-xl flex flex-col"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Member Details</h3>
                <button onClick={() => setSelectedMemberId(null)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Photo & name */}
                <div className="flex flex-col items-center text-center gap-3">
                  {selectedMember.photo ? (
                    <img
                      src={selectedMember.photo}
                      alt={selectedMember.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-zinc-600"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-600">
                      <User className="w-7 h-7 text-zinc-500" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-semibold">{selectedMember.name}</p>
                    {selectedMember.gender && (
                      <p className="text-zinc-500 text-xs capitalize">{selectedMember.gender}</p>
                    )}
                  </div>
                </div>

                {/* Details */}
                {(selectedMember.dateOfBirth || selectedMember.dateOfDeath) && (
                  <div className="bg-zinc-800/60 rounded-xl p-3 space-y-1.5">
                    {selectedMember.dateOfBirth && (
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Born</span>
                        <span className="text-zinc-300">{selectedMember.dateOfBirth}</span>
                      </div>
                    )}
                    {selectedMember.dateOfDeath && (
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Died</span>
                        <span className="text-zinc-300">{selectedMember.dateOfDeath}</span>
                      </div>
                    )}
                  </div>
                )}

                {selectedMember.bio && (
                  <p className="text-zinc-400 text-xs leading-relaxed">{selectedMember.bio}</p>
                )}

                {/* Existing relationships */}
                {(() => {
                  const rels = tree.relationships.filter(r =>
                    r.parentId === selectedMember.id ||
                    r.childId === selectedMember.id ||
                    r.member1Id === selectedMember.id ||
                    r.member2Id === selectedMember.id
                  );
                  if (rels.length === 0) return null;
                  return (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Relationships</p>
                      {rels.map(rel => {
                        let label = '';
                        let otherId = '';
                        if (rel.type === 'parent-child') {
                          if (rel.parentId === selectedMember.id) {
                            label = 'Parent of';
                            otherId = rel.childId!;
                          } else {
                            label = 'Child of';
                            otherId = rel.parentId!;
                          }
                        } else {
                          label = 'Spouse of';
                          otherId = rel.member1Id === selectedMember.id ? rel.member2Id! : rel.member1Id!;
                        }
                        const other = tree.members.find(m => m.id === otherId);
                        return (
                          <div key={rel.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-zinc-800/60">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-zinc-500 leading-none mb-0.5">{label}</p>
                              <p className="text-xs text-zinc-200 truncate font-medium">{other?.name ?? 'Unknown'}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteRelationship(rel.id)}
                              className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                              title="Remove relationship"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => setModal({ kind: 'edit-member', memberId: selectedMember.id })}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Details
                  </button>
                  <button
                    onClick={() => setModal({ kind: 'add-relationship', memberId: selectedMember.id, relType: 'parent' })}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition-colors"
                  >
                    <GitBranch className="w-3.5 h-3.5" /> Add Parent
                  </button>
                  <button
                    onClick={() => setModal({ kind: 'add-relationship', memberId: selectedMember.id, relType: 'child' })}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition-colors"
                  >
                    <GitMerge className="w-3.5 h-3.5" /> Add Child
                  </button>
                  <button
                    onClick={() => setModal({ kind: 'add-relationship', memberId: selectedMember.id, relType: 'spouse' })}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition-colors"
                  >
                    <Heart className="w-3.5 h-3.5 text-pink-400" /> Add Spouse
                  </button>
                  <button
                    onClick={() => setModal({ kind: 'delete-member', memberId: selectedMember.id })}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Member
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-full text-sm text-white shadow-xl"
          >
            <Check className="w-4 h-4 text-green-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {modal.kind === 'add-member' && (
          <MemberForm key="add" onSave={handleSaveMember} onClose={() => setModal({ kind: 'none' })} />
        )}
        {modal.kind === 'edit-member' && (
          <MemberForm
            key="edit"
            member={tree.members.find((m) => m.id === (modal as { kind: 'edit-member'; memberId: string }).memberId)}
            onSave={handleSaveMember}
            onClose={() => setModal({ kind: 'none' })}
          />
        )}
        {modal.kind === 'add-relationship' && (
          <RelationshipPanel
            key="rel"
            tree={tree}
            targetMemberId={(modal as { kind: 'add-relationship'; memberId: string; relType: 'parent' | 'child' | 'spouse' }).memberId}
            relType={(modal as { kind: 'add-relationship'; memberId: string; relType: 'parent' | 'child' | 'spouse' }).relType}
            onAdd={handleAddRelationship}
            onClose={() => setModal({ kind: 'none' })}
          />
        )}
        {modal.kind === 'delete-member' && (
          <ConfirmDeleteModal
            key="del-member"
            message={`Remove ${tree.members.find((m) => m.id === (modal as { kind: 'delete-member'; memberId: string }).memberId)?.name ?? 'this member'} and all their relationships from the tree?`}
            onConfirm={() => handleDeleteMember((modal as { kind: 'delete-member'; memberId: string }).memberId)}
            onCancel={() => setModal({ kind: 'none' })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
