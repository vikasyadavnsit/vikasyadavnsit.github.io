"use client";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, type EdgeProps } from '@xyflow/react';

export function CustomEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, animated, label,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: '#3f3f46',
          strokeWidth: 2,
          strokeDasharray: animated ? '5' : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="absolute pointer-events-auto nodrag nopan group flex items-center gap-0.5"
          style={{ transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)` }}
        >
          {label && (
            <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900/90 border border-zinc-700 rounded px-1 leading-4">
              {label as string}
            </span>
          )}
          <button
            onClick={() => setEdges(es => es.filter(e => e.id !== id))}
            title="Delete edge"
            className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-400 hover:text-red-400 hover:border-red-500 hover:bg-red-500/10 flex items-center justify-center text-[10px] transition-all leading-none"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
