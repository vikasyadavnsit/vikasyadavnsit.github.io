import type { FamilyTree, LayoutEdge, LayoutNode, TreeLayout } from '../types';
import { NODE_HEIGHT, NODE_WIDTH, H_GAP, V_GAP, SPOUSE_GAP } from '../types';

// ─── Graph ───────────────────────────────────────────────────────────────────

interface Graph {
  childrenOf: Map<string, string[]>;
  parentsOf: Map<string, string[]>;
  spouseOf: Map<string, string>;
  allIds: string[];
}

function buildGraph(tree: FamilyTree): Graph {
  const childrenOf = new Map<string, string[]>();
  const parentsOf = new Map<string, string[]>();
  const spouseOf = new Map<string, string>();
  for (const m of tree.members) {
    childrenOf.set(m.id, []);
    parentsOf.set(m.id, []);
  }
  for (const rel of tree.relationships) {
    if (rel.type === 'parent-child' && rel.parentId && rel.childId) {
      childrenOf.get(rel.parentId)?.push(rel.childId);
      parentsOf.get(rel.childId)?.push(rel.parentId);
    } else if (rel.type === 'spouse' && rel.member1Id && rel.member2Id) {
      spouseOf.set(rel.member1Id, rel.member2Id);
      spouseOf.set(rel.member2Id, rel.member1Id);
    }
  }
  return { childrenOf, parentsOf, spouseOf, allIds: tree.members.map(m => m.id) };
}

// ─── Generations ─────────────────────────────────────────────────────────────

function assignGenerations(graph: Graph): Map<string, number> {
  const gen = new Map<string, number>();
  const inQueue = new Set<string>();
  const queue: string[] = [];
  const maxGen = graph.allIds.length; // cycle guard

  for (const id of graph.allIds) {
    if ((graph.parentsOf.get(id) ?? []).length === 0) {
      gen.set(id, 0);
      queue.push(id);
      inQueue.add(id);
    }
  }

  // SPFA: deduped so each node is in queue at most once at a time
  let i = 0;
  while (i < queue.length) {
    const id = queue[i++];
    inQueue.delete(id);
    const g = gen.get(id) ?? 0;
    for (const childId of graph.childrenOf.get(id) ?? []) {
      const existing = gen.get(childId) ?? -1;
      const candidate = g + 1;
      if (candidate > existing && candidate <= maxGen) {
        gen.set(childId, candidate);
        if (!inQueue.has(childId)) {
          queue.push(childId);
          inQueue.add(childId);
        }
      }
    }
  }

  for (const id of graph.allIds) {
    if (!gen.has(id)) gen.set(id, 0);
  }

  // Spouse fixup: co-locate on the same generation
  let changed = true;
  while (changed) {
    changed = false;
    for (const [a, b] of graph.spouseOf) {
      const ga = gen.get(a) ?? 0;
      const gb = gen.get(b) ?? 0;
      const target = Math.max(ga, gb);
      if (ga !== target) { gen.set(a, target); changed = true; }
      if (gb !== target) { gen.set(b, target); changed = true; }
    }
  }

  return gen;
}

// ─── Unit tree ───────────────────────────────────────────────────────────────
//
// A "unit" is a couple (primary + spouse) or a single member.
// The unit tree is the family tree where nodes are units and edges are parent-child
// between units (each child belongs to exactly one "owning" parent unit).
//
// The unit tree is always a proper tree (forest), even when the underlying family
// graph is a DAG, by assigning each child to one owning parent unit.

function getUnitPrimary(id: string, spouseOf: Map<string, string>, allIds: string[]): string {
  const spouse = spouseOf.get(id);
  if (!spouse) return id;
  // The primary is whichever appears first in insertion order
  return allIds.indexOf(id) <= allIds.indexOf(spouse) ? id : spouse;
}

interface UnitTree {
  unitPrimaryOf: Map<string, string>;    // memberId  → unit primary
  unitMembers: Map<string, string[]>;    // unitPrimary → [primary, spouse?]
  unitChildren: Map<string, string[]>;   // unitPrimary → [child unitPrimary, ...]
}

function buildUnitTree(graph: Graph): UnitTree {
  // unitPrimaryOf: every member maps to the primary of their unit
  const unitPrimaryOf = new Map<string, string>();
  for (const id of graph.allIds) {
    unitPrimaryOf.set(id, getUnitPrimary(id, graph.spouseOf, graph.allIds));
  }

  // unitMembers
  const unitMembers = new Map<string, string[]>();
  for (const id of graph.allIds) {
    const up = unitPrimaryOf.get(id)!;
    if (!unitMembers.has(up)) {
      const spouse = graph.spouseOf.get(up);
      unitMembers.set(up, spouse ? [up, spouse] : [up]);
    }
  }

  // For each child, pick one owning parent unit.
  // If the child's two parents are spouses, the couple's primary unit owns it.
  // Otherwise the first parent (by insertion order) owns it.
  const owningUnitOf = new Map<string, string>(); // childId → owning unit primary
  for (const childId of graph.allIds) {
    const parents = graph.parentsOf.get(childId) ?? [];
    if (parents.length === 0) continue;
    let owningParent: string;
    if (parents.length === 1) {
      owningParent = parents[0];
    } else {
      const [p1, p2] = parents;
      owningParent = graph.allIds.indexOf(p1) <= graph.allIds.indexOf(p2) ? p1 : p2;
    }
    owningUnitOf.set(childId, unitPrimaryOf.get(owningParent)!);
  }

  // unitChildren: parent unit → [unique child unit primaries]
  const unitChildren = new Map<string, string[]>();
  for (const up of unitMembers.keys()) unitChildren.set(up, []);
  for (const [childId, parentUp] of owningUnitOf) {
    const childUp = unitPrimaryOf.get(childId)!;
    const list = unitChildren.get(parentUp)!;
    if (!list.includes(childUp)) list.push(childUp);
  }

  return { unitPrimaryOf, unitMembers, unitChildren };
}

// ─── Subtree widths (bottom-up) ───────────────────────────────────────────────

function computeWidths(
  ut: UnitTree,
): Map<string, number> {
  const cache = new Map<string, number>();
  const visiting = new Set<string>();

  function width(up: string): number {
    if (cache.has(up)) return cache.get(up)!;
    if (visiting.has(up)) return NODE_WIDTH; // cycle guard
    visiting.add(up);

    const isCouple = (ut.unitMembers.get(up) ?? []).length === 2;
    const ownW = isCouple ? NODE_WIDTH * 2 + SPOUSE_GAP : NODE_WIDTH;

    const children = ut.unitChildren.get(up) ?? [];
    if (children.length === 0) {
      cache.set(up, ownW);
      visiting.delete(up);
      return ownW;
    }

    const childW = children.reduce((s, cup) => s + width(cup), 0)
      + H_GAP * (children.length - 1);
    const result = Math.max(ownW, childW);
    cache.set(up, result);
    visiting.delete(up);
    return result;
  }

  for (const up of ut.unitMembers.keys()) width(up);
  return cache;
}

// ─── Position assignment (top-down) ──────────────────────────────────────────

function assignPositions(
  ut: UnitTree,
  widths: Map<string, number>,
  genMap: Map<string, number>,
): { nodeX: Map<string, number>; nodeY: Map<string, number> } {
  const nodeX = new Map<string, number>();
  const nodeY = new Map<string, number>();
  const visiting = new Set<string>();

  function place(up: string, startX: number): void {
    if (visiting.has(up)) return;
    visiting.add(up);

    const totalW = widths.get(up) ?? NODE_WIDTH;
    const centerX = startX + totalW / 2;

    const members = ut.unitMembers.get(up) ?? [up];
    const g = genMap.get(up) ?? 0;
    const y = g * (NODE_HEIGHT + V_GAP) + NODE_HEIGHT / 2 + 20;

    if (members.length === 2) {
      const [primary, spouse] = members;
      // Place primary and spouse symmetrically around centerX
      nodeX.set(primary, centerX - (SPOUSE_GAP / 2 + NODE_WIDTH / 2));
      nodeX.set(spouse, centerX + (SPOUSE_GAP / 2 + NODE_WIDTH / 2));
      nodeY.set(primary, y);
      nodeY.set(spouse, y);
    } else {
      nodeX.set(up, centerX);
      nodeY.set(up, y);
    }

    const children = ut.unitChildren.get(up) ?? [];
    if (children.length === 0) return;

    // Center children within the allocated horizontal space
    const childrenW = children.reduce((s, cup) => s + (widths.get(cup) ?? NODE_WIDTH), 0)
      + H_GAP * (children.length - 1);
    let childCursor = startX + (totalW - childrenW) / 2;

    for (const cup of children) {
      place(cup, childCursor);
      childCursor += (widths.get(cup) ?? NODE_WIDTH) + H_GAP;
    }
  }

  // Root units = units that are not a child of any other unit
  const allChildUnits = new Set([...ut.unitChildren.values()].flat());
  const roots = [...ut.unitMembers.keys()].filter(up => !allChildUnits.has(up));

  const PAD = 20;
  let cursor = PAD;
  for (const up of roots) {
    place(up, cursor);
    cursor += (widths.get(up) ?? NODE_WIDTH) + H_GAP;
  }

  return { nodeX, nodeY };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function computeLayout(tree: FamilyTree): TreeLayout {
  if (tree.members.length === 0) {
    return { nodes: [], edges: [], totalWidth: 400, totalHeight: 300 };
  }

  const graph = buildGraph(tree);
  const genMap = assignGenerations(graph);
  const ut = buildUnitTree(graph);
  const widths = computeWidths(ut);
  const { nodeX, nodeY } = assignPositions(ut, widths, genMap);

  const PAD = 20;
  let orphanCursor = (nodeX.size > 0 ? Math.max(...nodeX.values()) + NODE_WIDTH / 2 + H_GAP : PAD);

  const nodes: LayoutNode[] = graph.allIds.map(id => {
    const x = nodeX.get(id);
    const y = nodeY.get(id);
    if (x === undefined || y === undefined) {
      const nx = orphanCursor;
      orphanCursor += NODE_WIDTH + H_GAP;
      return { memberId: id, x: nx, y: PAD + NODE_HEIGHT / 2, generation: genMap.get(id) ?? 0 };
    }
    return { memberId: id, x, y, generation: genMap.get(id) ?? 0 };
  });

  const nodePos = new Map(nodes.map(n => [n.memberId, { x: n.x, y: n.y }]));

  const edges: LayoutEdge[] = [];
  for (const rel of tree.relationships) {
    if (rel.type === 'parent-child' && rel.parentId && rel.childId) {
      const from = nodePos.get(rel.parentId);
      const to = nodePos.get(rel.childId);
      if (from && to) {
        const cpY = (from.y + NODE_HEIGHT / 2 + to.y - NODE_HEIGHT / 2) / 2;
        edges.push({
          fromX: from.x,
          fromY: from.y + NODE_HEIGHT / 2,
          toX: to.x,
          toY: to.y - NODE_HEIGHT / 2,
          type: 'parent-child',
        });
      }
    } else if (rel.type === 'spouse' && rel.member1Id && rel.member2Id) {
      const a = nodePos.get(rel.member1Id);
      const b = nodePos.get(rel.member2Id);
      if (a && b) {
        const left = a.x < b.x ? a : b;
        const right = a.x < b.x ? b : a;
        edges.push({
          fromX: left.x + NODE_WIDTH / 2,
          fromY: left.y,
          toX: right.x - NODE_WIDTH / 2,
          toY: right.y,
          type: 'spouse',
        });
      }
    }
  }

  const allXs = nodes.map(n => n.x);
  const allYs = nodes.map(n => n.y);
  const totalWidth = Math.max(...allXs) + NODE_WIDTH / 2 + PAD;
  const totalHeight = Math.max(...allYs) + NODE_HEIGHT / 2 + PAD;

  return { nodes, edges, totalWidth, totalHeight };
}
