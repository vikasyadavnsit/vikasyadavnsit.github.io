"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, RotateCcw, Undo2, Redo2, Eraser,
  MousePointer2, Download, Square, Circle,
  Maximize2, Move
} from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface DrawSetItem {
  strokeColor: any;
  strokeWeight: number;
  tool: string;
  dataset: [number, number, number, number][];
}

const Tooltip = ({ children, text, position = "top" }: { children: React.ReactNode, text: string, position?: "top" | "bottom" | "left" | "right" }) => {
  const [show, setShow] = useState(false);
  const positions = {
    top: "-top-10 left-1/2 -translate-x-1/2",
    bottom: "-bottom-10 left-1/2 -translate-x-1/2",
    left: "top-1/2 -right-2 translate-x-full -translate-y-1/2",
    right: "top-1/2 left-full ml-3 -translate-y-1/2"
  };
  return (
    <div className="relative inline-flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: position === "top" ? 5 : -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn("absolute z-[100] px-3 py-1.5 bg-gray-900 text-white text-[11px] font-bold rounded-lg shadow-xl pointer-events-none whitespace-nowrap", positions[position])}
          >
            {text}
            <div className={cn("absolute border-4 border-transparent", position === "top" && "top-full left-1/2 -translate-x-1/2 border-t-gray-900", position === "bottom" && "bottom-full left-1/2 -translate-x-1/2 border-b-gray-900", (position === "left" || position === "right") && "right-full top-1/2 -translate-y-1/2 border-r-gray-900")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function ScratchpadPage() {
  const [strokeWeight, setStrokeWeight] = useState(2);
  const [strokeColor, setStrokeColor] = useState("#9400D3");
  const [activeTool, setActiveTool] = useState("pencil");
  const [drawSet, setDrawSet] = useState<DrawSetItem[]>([]);
  const [drawLength, setDrawLength] = useState(0);
  const [isUiVisible, setIsUiVisible] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("scratchpad_data");
    if (saved) {
      try {
        const { drawSet: savedSet, drawLength: savedLen } = JSON.parse(saved);
        setDrawSet(savedSet);
        setDrawLength(savedLen);
      } catch (e) {
        console.error("Failed to load scratchpad data", e);
      }
    }
  }, []);

  // Save to localStorage whenever data changes
  const saveToLocal = (newSet: DrawSetItem[], newLen: number) => {
    localStorage.setItem("scratchpad_data", JSON.stringify({ drawSet: newSet, drawLength: newLen }));
  };

  const toolSettingsRef = useRef({ strokeWeight, strokeColor, activeTool });
  const drawSetRef = useRef<DrawSetItem[]>([]);
  const drawLengthRef = useRef(0);
  const currentPathRef = useRef<[number, number, number, number][]>([]);
  const startPosRef = useRef({ x: 0, y: 0 });
  const p5InstanceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bufferRef = useRef<any>(null); // Off-screen buffer

  useEffect(() => {
    toolSettingsRef.current = { strokeWeight, strokeColor, activeTool };
  }, [strokeWeight, strokeColor, activeTool]);

  useEffect(() => {
    drawSetRef.current = drawSet;
    drawLengthRef.current = drawLength;
  }, [drawSet, drawLength]);

  // Redraws the entire history onto the buffer
  const rebuildBuffer = (s: any) => {
    if (!bufferRef.current) return;
    const b = bufferRef.current;
    b.background(255);
    for (let i = 0; i < drawLengthRef.current; i++) {
      const data = drawSetRef.current[i];
      b.stroke(data.strokeColor);
      b.strokeWeight(data.strokeWeight);
      if (data.tool === "pencil" || data.tool === "eraser") {
        data.dataset.forEach((e: any) => b.line(e[0], e[1], e[2], e[3]));
      } else if (data.tool === "rect") {
        const [x1, y1, x2, y2] = data.dataset[0];
        b.noFill(); b.rect(x1, y1, x2 - x1, y2 - y1);
      } else if (data.tool === "circle") {
        const [x1, y1, x2, y2] = data.dataset[0];
        b.noFill(); b.circle(x1, y1, s.dist(x1, y1, x2, y2) * 2);
      }
    }
  };

  const initP5 = () => {
    const p5 = (window as any).p5;
    if (!p5 || p5InstanceRef.current) return;

    new p5((s: any) => {
      p5InstanceRef.current = s;

      s.setup = () => {
        const canvas = s.createCanvas(s.windowWidth, s.windowHeight);
        if (containerRef.current) canvas.parent(containerRef.current);
        canvas.style('display', 'block');

        // Initialize buffer
        bufferRef.current = s.createGraphics(s.windowWidth, s.windowHeight);
        bufferRef.current.background(255);
        s.background(255);

        // Ensure ref is synced with state on init
        toolSettingsRef.current = { strokeWeight, strokeColor, activeTool };
      };

      s.mousePressed = () => {
        if (s.mouseButton !== s.LEFT) return;
        startPosRef.current = { x: s.mouseX, y: s.mouseY };
      };

      s.draw = () => {
        const { activeTool, strokeColor, strokeWeight } = toolSettingsRef.current;

        // 1. Clear main canvas and show buffer (cached history)
        s.image(bufferRef.current, 0, 0);

        // 2. Draw active preview on top of history
        if (s.mouseIsPressed && s.mouseButton === s.LEFT) {
          const x = s.mouseX;
          const y = s.mouseY;

          s.push();
          if (activeTool === "pencil" || activeTool === "eraser") {
            if (activeTool === "eraser") { s.stroke(255); s.strokeWeight(20); }
            else { s.stroke(strokeColor); s.strokeWeight(strokeWeight); }

            // For pencil, we collect segments
            currentPathRef.current.push([x, y, s.pmouseX, s.pmouseY]);

            // Draw current stroke path
            currentPathRef.current.forEach(e => s.line(e[0], e[1], e[2], e[3]));
          } else {
            s.stroke(strokeColor);
            s.strokeWeight(strokeWeight);
            s.noFill();
            if (activeTool === "rect") {
              s.rect(startPosRef.current.x, startPosRef.current.y, x - startPosRef.current.x, y - startPosRef.current.y);
            } else if (activeTool === "circle") {
              const d = s.dist(startPosRef.current.x, startPosRef.current.y, x, y) * 2;
              s.circle(startPosRef.current.x, startPosRef.current.y, d);
            }
          }
          s.pop();
        }
      };

      s.mouseReleased = () => {
        if (s.mouseButton !== s.LEFT) return;
        const { activeTool, strokeColor, strokeWeight } = toolSettingsRef.current;

        let newDataset: [number, number, number, number][] = [];
        const b = bufferRef.current;

        if (activeTool === "pencil" || activeTool === "eraser") {
          if (currentPathRef.current.length === 0) return;
          newDataset = [...currentPathRef.current];

          // Draw to buffer once
          b.push();
          if (activeTool === "eraser") { b.stroke(255); b.strokeWeight(20); }
          else { b.stroke(strokeColor); b.strokeWeight(strokeWeight); }
          newDataset.forEach(e => b.line(e[0], e[1], e[2], e[3]));
          b.pop();
        } else {
          newDataset = [[startPosRef.current.x, startPosRef.current.y, s.mouseX, s.mouseY]];

          // Draw to buffer once
          b.push();
          b.stroke(strokeColor);
          b.strokeWeight(strokeWeight);
          b.noFill();
          if (activeTool === "rect") {
            b.rect(startPosRef.current.x, startPosRef.current.y, s.mouseX - startPosRef.current.x, s.mouseY - startPosRef.current.y);
          } else if (activeTool === "circle") {
            const d = s.dist(startPosRef.current.x, startPosRef.current.y, s.mouseX, s.mouseY) * 2;
            b.circle(startPosRef.current.x, startPosRef.current.y, d);
          }
          b.pop();
        }

        const newPath: DrawSetItem = {
          strokeColor: activeTool === "eraser" ? "#FFFFFF" : strokeColor,
          strokeWeight: activeTool === "eraser" ? 20 : strokeWeight,
          tool: activeTool,
          dataset: newDataset,
        };

        const newDrawSet = drawSetRef.current.slice(0, drawLengthRef.current);
        newDrawSet.push(newPath);

        setDrawSet(newDrawSet);
        setDrawLength(newDrawSet.length);
        saveToLocal(newDrawSet, newDrawSet.length);
        currentPathRef.current = [];
      };

      s.windowResized = () => {
        s.resizeCanvas(s.windowWidth, s.windowHeight);
        bufferRef.current.resizeCanvas(s.windowWidth, s.windowHeight);
        rebuildBuffer(s);
      };
    });
  };

  useEffect(() => {
    if ((window as any).p5 && !p5InstanceRef.current) initP5();
  }, []);

  const handleUndo = () => {
    if (drawLength > 0) {
      const newLen = drawLength - 1;
      setDrawLength(newLen);
      saveToLocal(drawSet, newLen);
      setTimeout(() => { if (p5InstanceRef.current) rebuildBuffer(p5InstanceRef.current); }, 0);
    }
  };

  const handleRedo = () => {
    if (drawLength < drawSet.length) {
      const newLen = drawLength + 1;
      setDrawLength(newLen);
      saveToLocal(drawSet, newLen);
      setTimeout(() => { if (p5InstanceRef.current) rebuildBuffer(p5InstanceRef.current); }, 0);
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear the canvas?")) {
      setDrawSet([]);
      setDrawLength(0);
      saveToLocal([], 0);
      if (bufferRef.current) bufferRef.current.background(255);
    }
  };

  const handleDownload = () => { if (p5InstanceRef.current) p5InstanceRef.current.saveCanvas('my-sketch', 'png'); };

  return (
    <main className="min-h-screen bg-[#f8f9fa] overflow-hidden relative selection:none">
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js" onLoad={initP5} />

      <div className={cn("absolute top-0 left-0 right-0 z-40 transition-all duration-500", isUiVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0")}>
      </div>

      {/* Sidebar Tools */}
      <div className={cn(
        "fixed z-50 flex bg-white/80 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/40 transition-all duration-500",
        // Desktop: Left vertical
        "md:left-6 md:top-1/2 md:-translate-y-1/2 md:flex-col md:gap-3 md:p-3",
        // Mobile: Top horizontal
        "left-1/2 top-4 -translate-x-1/2 flex-row gap-2 p-2",
        isUiVisible ? "translate-y-0 opacity-100" : "-translate-y-32 opacity-0 md:translate-y-0 md:-translate-x-32"
      )}>
        <Tooltip text="Back to Projects" position="right">
          <Link href="/projects/creative-stuff" className="p-2 md:p-3 bg-gray-100 text-gray-600 rounded-2xl hover:bg-primary hover:text-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Tooltip>
        <div className="w-px md:w-auto md:h-px bg-gray-200 mx-1 md:mx-2 my-2 md:my-1" />
        {[
          { id: 'pencil', icon: MousePointer2, label: 'Pencil Tool' },
          { id: 'eraser', icon: Eraser, label: 'Eraser Tool' },
          { id: 'rect', icon: Square, label: 'Rectangle Shape' },
          { id: 'circle', icon: Circle, label: 'Circle Shape' },
        ].map((tool) => (
          <Tooltip key={tool.id} text={tool.label} position="right">
            <button onClick={() => setActiveTool(tool.id)} className={cn("p-2.5 md:p-4 rounded-2xl transition-all", activeTool === tool.id ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-gray-500 hover:bg-gray-100")}>
              <tool.icon className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </Tooltip>
        ))}
        <div className="w-px md:w-auto md:h-px bg-gray-200 mx-1 md:mx-2 my-2 md:my-1" />
        <Tooltip text="Toggle Immersive Mode" position="right">
          <button onClick={() => setIsUiVisible(!isUiVisible)} className="p-2.5 md:p-4 text-gray-500 hover:bg-gray-100 rounded-2xl transition-all">
            <Maximize2 className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </Tooltip>
      </div>

      {/* Control Bar */}
      <div className={cn(
        "fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center justify-center gap-4 md:gap-6 px-4 md:px-8 py-3 md:py-5 bg-white/90 backdrop-blur-2xl rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/40 transition-all duration-500 w-[90%] md:w-auto",
        isUiVisible ? "translate-y-0 opacity-100" : "translate-y-32 opacity-0"
      )}>
        <div className="flex items-center gap-2 md:gap-4 md:pr-6 md:border-r border-gray-200">
          <Tooltip text="Pick Custom Color" position="top">
            <div className="relative group">
              <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl cursor-pointer bg-white border-2 border-gray-100 p-1 shadow-sm transition-transform group-hover:scale-105" />
            </div>
          </Tooltip>
          <div className="flex flex-wrap gap-1.5 md:gap-2 max-w-[100px] md:max-w-[140px]">
            {['#9400D3', '#FF0000', '#0000FF', '#00FF00', '#FFA500', '#000000'].map(c => (
              <button
                key={c}
                onClick={() => setStrokeColor(c)}
                className={cn(
                  "w-6 h-6 md:w-8 md:h-8 rounded-lg md:rounded-xl border-2 transition-all hover:scale-110 shadow-sm",
                  strokeColor === c ? "border-primary scale-110 ring-2 ring-primary/20" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 md:gap-2 min-w-[140px] md:min-w-[200px] md:px-6 md:border-r border-gray-200 flex-1 max-w-[250px]">
          <div className="flex justify-between items-center text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            <span>Thickness</span> <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">{strokeWeight}px</span>
          </div>
          <input type="range" min="1" max="60" value={strokeWeight} onChange={(e) => setStrokeWeight(parseInt(e.target.value))} className="w-full h-1.5 md:h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-primary" />
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Tooltip text="Undo" position="top">
            <button onClick={handleUndo} disabled={drawLength === 0} className="p-2 md:p-3 text-gray-500 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <Undo2 className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </Tooltip>
          <Tooltip text="Redo" position="top">
            <button onClick={handleRedo} disabled={drawLength === drawSet.length} className="p-2 md:p-3 text-gray-500 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <Redo2 className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </Tooltip>
          <Tooltip text="Clear All" position="top">
            <button onClick={handleReset} className="p-2 md:p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all">
              <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </Tooltip>
          <div className="w-px h-6 md:h-8 bg-gray-200 mx-1 md:mx-2" />
          <Tooltip text="Export PNG" position="top">
            <button onClick={handleDownload} className="flex items-center gap-1 md:gap-2 px-3 md:px-6 py-2 md:py-3 bg-gray-900 text-white rounded-xl md:rounded-2xl hover:bg-primary transition-all shadow-lg group">
              <Download className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-xs md:text-sm">Export</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {!isUiVisible && (
        <Tooltip text="Show Controls" position="top">
          <button onClick={() => setIsUiVisible(true)} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] p-4 bg-primary text-white rounded-full shadow-2xl animate-bounce">
            <Move className="w-6 h-6" />
          </button>
        </Tooltip>
      )}

      <div ref={containerRef} className="w-full h-full cursor-crosshair active:cursor-none" />

      <style jsx global>{`
        body { overscroll-behavior-y: contain; touch-action: none; }
        .p5Canvas { box-shadow: inset 0 0 100px rgba(0,0,0,0.02); }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none; width: 16px; height: 16px; background: white;
          border: 3px solid #3b82f6; border-radius: 50%; cursor: pointer; transition: all 0.2s;
        }
      `}</style>
    </main>
  );
}
