'use client';
import type { TreeLayout, Member, Relationship } from '../types';
import { NODE_WIDTH, NODE_HEIGHT } from '../types';
import MemberNode from './MemberNode';

interface Props {
  layout: TreeLayout;
  members: Member[];
  relationships: Relationship[];
  selectedMemberId: string | null;
  onSelectMember: (id: string) => void;
  onNodeDragStart: (memberId: string, e: React.MouseEvent) => void;
}

export default function TreeCanvas({
  layout, members, relationships, selectedMemberId, onSelectMember, onNodeDragStart,
}: Props) {
  const memberMap = new Map(members.map(m => [m.id, m]));

  // children count per member (how many parent-child rels where this member is parent)
  const childrenCountMap = new Map<string, number>();
  for (const rel of relationships) {
    if (rel.type === 'parent-child' && rel.parentId) {
      childrenCountMap.set(rel.parentId, (childrenCountMap.get(rel.parentId) ?? 0) + 1);
    }
  }

  if (layout.nodes.length === 0) {
    return (
      <svg width={400} height={300} className="block">
        <text x={200} y={150} textAnchor="middle" dominantBaseline="middle" fill="#3f3f46" fontSize={13}>
          Add your first member to get started
        </text>
      </svg>
    );
  }

  return (
    <svg
      width={layout.totalWidth}
      height={layout.totalHeight}
      className="block overflow-visible"
      style={{ minWidth: layout.totalWidth, minHeight: layout.totalHeight }}
    >
      <defs>
        <filter id="edge-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
      </defs>

      {/* Edges */}
      <g>
        {layout.edges.map((edge, i) => {
          if (edge.type === 'parent-child') {
            const cpY = (edge.fromY + edge.toY) / 2;
            return (
              <path
                key={`e${i}`}
                d={`M ${edge.fromX} ${edge.fromY} C ${edge.fromX} ${cpY}, ${edge.toX} ${cpY}, ${edge.toX} ${edge.toY}`}
                stroke="#6366f1"
                strokeWidth={1.8}
                fill="none"
                strokeLinecap="round"
                opacity={0.65}
              />
            );
          }
          return (
            <line
              key={`e${i}`}
              x1={edge.fromX} y1={edge.fromY}
              x2={edge.toX} y2={edge.toY}
              stroke="#f43f5e"
              strokeWidth={1.8}
              strokeDasharray="4 3"
              strokeLinecap="round"
              opacity={0.75}
            />
          );
        })}
      </g>

      {/* Nodes */}
      <g>
        {layout.nodes.map(node => {
          const member = memberMap.get(node.memberId);
          if (!member) return null;
          const x = node.x - NODE_WIDTH / 2;
          const y = node.y - NODE_HEIGHT / 2;
          return (
            <foreignObject
              key={node.memberId}
              x={x} y={y}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              overflow="visible"
              onMouseDown={e => {
                e.stopPropagation();
                onNodeDragStart(node.memberId, e);
              }}
            >
              <div style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}>
                <MemberNode
                  member={member}
                  isSelected={selectedMemberId === node.memberId}
                  childrenCount={childrenCountMap.get(node.memberId) ?? 0}
                  onClick={() => onSelectMember(node.memberId)}
                  onMouseDown={() => {/* handled at foreignObject level */}}
                />
              </div>
            </foreignObject>
          );
        })}
      </g>
    </svg>
  );
}
