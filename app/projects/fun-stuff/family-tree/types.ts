export interface FamilyTree {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  members: Member[];
  relationships: Relationship[];
}

export interface Member {
  id: string;
  name: string;
  photo?: string;
  dateOfBirth?: string;
  dateOfDeath?: string;
  bio?: string;
  gender?: 'male' | 'female' | 'other';
}

export interface Relationship {
  id: string;
  type: 'parent-child' | 'spouse';
  parentId?: string;
  childId?: string;
  member1Id?: string;
  member2Id?: string;
}

export interface LayoutNode {
  memberId: string;
  x: number;
  y: number;
  generation: number;
}

export interface LayoutEdge {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  type: 'parent-child' | 'spouse';
}

export interface TreeLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  totalWidth: number;
  totalHeight: number;
}

export type AppView = { kind: 'dashboard' } | { kind: 'editor'; treeId: string };

export type ActiveModal =
  | { kind: 'none' }
  | { kind: 'create-tree' }
  | { kind: 'add-member' }
  | { kind: 'import'; preloadedTree?: FamilyTree }
  | { kind: 'edit-member'; memberId: string }
  | { kind: 'delete-member'; memberId: string }
  | { kind: 'add-relationship'; memberId: string; relType: 'parent' | 'child' | 'spouse' }
  | { kind: 'delete-tree'; treeId: string }
  | { kind: 'share'; treeId: string };

export const NODE_WIDTH = 140;
export const NODE_HEIGHT = 80;
export const H_GAP = 40;
export const V_GAP = 100;
export const SPOUSE_GAP = 20;
