import type { FamilyTree, Member, Relationship } from '../types';

const KEYS = {
  index: 'family-tree:index',
  tree: (id: string) => `family-tree:tree:${id}`,
} as const;

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full — caller handles UI feedback
  }
}

export function getTreeIndex(): string[] {
  return safeGet<string[]>(KEYS.index, []);
}

export function saveTreeIndex(ids: string[]): void {
  safeSet(KEYS.index, ids);
}

export function getTree(id: string): FamilyTree | null {
  return safeGet<FamilyTree | null>(KEYS.tree(id), null);
}

export function saveTree(tree: FamilyTree): void {
  safeSet(KEYS.tree(tree.id), tree);
}

export function deleteTree(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEYS.tree(id));
  const index = getTreeIndex().filter((tid) => tid !== id);
  saveTreeIndex(index);
}

export function getAllTrees(): FamilyTree[] {
  return getTreeIndex()
    .map(getTree)
    .filter((t): t is FamilyTree => t !== null);
}

export function createTree(name: string): FamilyTree {
  const id = crypto.randomUUID();
  const now = Date.now();
  const tree: FamilyTree = { id, name, createdAt: now, updatedAt: now, members: [], relationships: [] };
  saveTree(tree);
  const index = getTreeIndex();
  saveTreeIndex([...index, id]);
  return tree;
}

export function updateMember(treeId: string, member: Member): void {
  const tree = getTree(treeId);
  if (!tree) return;
  const idx = tree.members.findIndex((m) => m.id === member.id);
  if (idx === -1) {
    tree.members.push(member);
  } else {
    tree.members[idx] = member;
  }
  tree.updatedAt = Date.now();
  saveTree(tree);
}

export function deleteMember(treeId: string, memberId: string): void {
  const tree = getTree(treeId);
  if (!tree) return;
  tree.members = tree.members.filter((m) => m.id !== memberId);
  tree.relationships = tree.relationships.filter(
    (r) =>
      r.parentId !== memberId &&
      r.childId !== memberId &&
      r.member1Id !== memberId &&
      r.member2Id !== memberId
  );
  tree.updatedAt = Date.now();
  saveTree(tree);
}

export function addRelationship(treeId: string, rel: Relationship): void {
  const tree = getTree(treeId);
  if (!tree) return;
  tree.relationships.push(rel);
  tree.updatedAt = Date.now();
  saveTree(tree);
}

export function deleteRelationship(treeId: string, relId: string): void {
  const tree = getTree(treeId);
  if (!tree) return;
  tree.relationships = tree.relationships.filter((r) => r.id !== relId);
  tree.updatedAt = Date.now();
  saveTree(tree);
}
