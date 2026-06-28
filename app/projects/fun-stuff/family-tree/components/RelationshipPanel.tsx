'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Search } from 'lucide-react';
import type { FamilyTree, Member, Relationship } from '../types';

interface Props {
  tree: FamilyTree;
  targetMemberId: string;
  relType: 'parent' | 'child' | 'spouse';
  onAdd: (rel: Relationship) => void;
  onClose: () => void;
}

function isAncestor(childId: string, ancestorId: string, childrenOf: Map<string, string[]>): boolean {
  const visited = new Set<string>();
  const stack = [childId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === ancestorId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const c of childrenOf.get(cur) ?? []) stack.push(c);
  }
  return false;
}

export default function RelationshipPanel({ tree, targetMemberId, relType, onAdd, onClose }: Props) {
  const [query, setQuery] = useState('');

  // Build adjacency
  const childrenOf = new Map<string, string[]>();
  const parentsOf = new Map<string, string[]>();
  const spouseOf = new Map<string, string>();
  for (const m of tree.members) { childrenOf.set(m.id, []); parentsOf.set(m.id, []); }
  for (const rel of tree.relationships) {
    if (rel.type === 'parent-child' && rel.parentId && rel.childId) {
      childrenOf.get(rel.parentId)?.push(rel.childId);
      parentsOf.get(rel.childId)?.push(rel.parentId);
    } else if (rel.type === 'spouse' && rel.member1Id && rel.member2Id) {
      spouseOf.set(rel.member1Id, rel.member2Id);
      spouseOf.set(rel.member2Id, rel.member1Id);
    }
  }

  const parentCount = (parentsOf.get(targetMemberId) ?? []).length;
  const spouseCount = spouseOf.has(targetMemberId) ? 1 : 0;

  const candidates = tree.members.filter((m) => {
    if (m.id === targetMemberId) return false;

    if (relType === 'parent') {
      if (parentCount >= 2) return false;
      // Candidate cannot already be a parent of target
      if ((parentsOf.get(targetMemberId) ?? []).includes(m.id)) return false;
      // Circular check: candidate cannot be a descendant of target
      if (isAncestor(m.id, targetMemberId, childrenOf)) return false;
    }

    if (relType === 'child') {
      // Target cannot already be a parent of candidate
      if ((parentsOf.get(m.id) ?? []).includes(targetMemberId)) return false;
      // Candidate cannot already have 2 parents
      if ((parentsOf.get(m.id) ?? []).length >= 2) return false;
      // Circular check
      if (isAncestor(targetMemberId, m.id, childrenOf)) return false;
    }

    if (relType === 'spouse') {
      if (spouseCount >= 1) return false;
      if (spouseOf.has(m.id)) return false;
    }

    return true;
  });

  const filtered = candidates.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase())
  );

  const labels: Record<string, string> = {
    parent: 'Add as Parent of',
    child: 'Add as Child of',
    spouse: 'Add as Spouse of',
  };

  const targetName = tree.members.find((m) => m.id === targetMemberId)?.name ?? 'member';

  function handleSelect(candidate: Member) {
    let rel: Relationship;
    const id = crypto.randomUUID();

    if (relType === 'parent') {
      rel = { id, type: 'parent-child', parentId: candidate.id, childId: targetMemberId };
    } else if (relType === 'child') {
      rel = { id, type: 'parent-child', parentId: targetMemberId, childId: candidate.id };
    } else {
      rel = { id, type: 'spouse', member1Id: targetMemberId, member2Id: candidate.id };
    }

    onAdd(rel);
  }

  const isBlocked =
    (relType === 'parent' && parentCount >= 2) || (relType === 'spouse' && spouseCount >= 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-white font-semibold mb-1">{labels[relType]}</h3>
        <p className="text-zinc-400 text-sm mb-4">{targetName}</p>

        {isBlocked ? (
          <p className="text-amber-400 text-sm">
            {relType === 'parent' ? 'This member already has 2 parents.' : 'This member already has a spouse.'}
          </p>
        ) : (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search members..."
                className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 text-sm"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1">
              {filtered.length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-4">
                  {candidates.length === 0 ? 'No eligible members available.' : 'No members match your search.'}
                </p>
              )}
              {filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800 text-left transition-colors"
                >
                  {m.photo ? (
                    <img src={m.photo} alt={m.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 text-xs text-zinc-400 font-semibold">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{m.name}</p>
                    {m.dateOfBirth && (
                      <p className="text-zinc-500 text-xs">b. {m.dateOfBirth.slice(0, 4)}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
