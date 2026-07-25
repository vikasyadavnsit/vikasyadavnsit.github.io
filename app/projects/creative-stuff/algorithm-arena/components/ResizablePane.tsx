"use client";
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  left: React.ReactNode;
  right: React.ReactNode;
  initialRatio?: number; // 0 to 100
  minRatio?: number;
  maxRatio?: number;
  direction?: 'horizontal' | 'vertical';
  className?: string;
  leftClassName?: string;
  rightClassName?: string;
}

export function ResizablePane({
  left,
  right,
  initialRatio = 30,
  minRatio = 15,
  maxRatio = 85,
  direction = 'horizontal',
  className,
  leftClassName,
  rightClassName,
}: Props) {
  const [ratio, setRatio] = useState(initialRatio);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [direction]);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    let newRatio;

    if (direction === 'horizontal') {
      newRatio = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    } else {
      newRatio = ((e.clientY - containerRect.top) / containerRect.height) * 100;
    }

    if (newRatio >= minRatio && newRatio <= maxRatio) {
      setRatio(newRatio);
    }
  }, [direction, minRatio, maxRatio]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full w-full overflow-hidden",
        direction === 'horizontal' ? 'flex-row' : 'flex-col',
        className
      )}
    >
      <div
        className={cn("overflow-hidden", leftClassName)}
        style={{ [direction === 'horizontal' ? 'width' : 'height']: `${ratio}%` }}
      >
        {left}
      </div>

      <div
        onMouseDown={startResizing}
        className={cn(
          "bg-zinc-800 hover:bg-indigo-500/50 transition-colors flex-shrink-0 z-10",
          direction === 'horizontal' ? 'w-1 cursor-col-resize h-full' : 'h-1 cursor-row-resize w-full'
        )}
      />

      <div
        className={cn("overflow-hidden", rightClassName)}
        style={{ [direction === 'horizontal' ? 'width' : 'height']: `${100 - ratio}%` }}
      >
        {right}
      </div>
    </div>
  );
}
