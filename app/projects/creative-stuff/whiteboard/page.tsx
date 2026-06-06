"use client";
import React, { useEffect, useRef, useState, Suspense } from "react";
import Navbar from "@/components/sections/Navbar";
import {
  ArrowLeft, RotateCcw, Undo2, Redo2, Eraser,
  MousePointer2, Share2, Square, Circle, Maximize2, Move,
  Book, Folder, FileText, Plus, Trash2, ChevronRight, Layout
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
// import { db, auth } from "@/lib/firebase";
// import { ref, onValue, update, push, remove } from "firebase/database";
// import { onAuthStateChanged } from "firebase/auth";
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

function WhiteboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const p = searchParams.get('p');
  const c = searchParams.get('c');
  const u = searchParams.get('u');

  const [strokeWeight, setStrokeWeight] = useState(2);
  const [strokeColor, setStrokeColor] = useState("#9400D3");
  const [activeTool, setActiveTool] = useState("pencil");
  const [drawSet, setDrawSet] = useState<DrawSetItem[]>([]);
  const [drawLength, setDrawLength] = useState(0);
  const [isAuthorized, setIsAuthorized] = useState(true); // Default to true for Phase 1
  const [loading, setLoading] = useState(true);
  const [isUiVisible, setIsUiVisible] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Hierarchy State
  const [notebook, setNotebook] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(p);
  const [activePageId, setActivePageId] = useState<string | null>(c);
  const [userId, setUserId] = useState<string | null>("local-user");

  const toolSettingsRef = useRef({ strokeWeight, strokeColor, activeTool, isAuthorized });
  const drawSetRef = useRef<DrawSetItem[]>([]);
  const drawLengthRef = useRef(0);
  const currentPathRef = useRef<[number, number, number, number][]>([]);
  const startPosRef = useRef({ x: 0, y: 0 });
  const p5InstanceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bufferRef = useRef<any>(null);

  useEffect(() => {
    toolSettingsRef.current = { strokeWeight, strokeColor, activeTool, isAuthorized };
  }, [strokeWeight, strokeColor, activeTool, isAuthorized]);

  useEffect(() => {
    drawSetRef.current = drawSet;
    drawLengthRef.current = drawLength;
  }, [drawSet, drawLength]);

  // Persistence Helpers
  const saveNotebookToLocal = (data: any) => {
    localStorage.setItem("whiteboard_notebook", JSON.stringify(data));
  };

  const getNotebookFromLocal = () => {
    const saved = localStorage.getItem("whiteboard_notebook");
    if (saved) return JSON.parse(saved);
    return { notebookName: "My Local Notebook", sections: {} };
  };

  // Initial Load
  useEffect(() => {
    const data = getNotebookFromLocal();
    setNotebook(data);
    if (data.sections) {
      const secList = Object.entries(data.sections).map(([id, val]: any) => ({ id, ...val }));
      setSections(secList);
      if (!activeSectionId && secList.length > 0) {
        setActiveSectionId(secList[0].id);
      }
    }
    setLoading(false);
  }, []);

  // Page Content Loader
  useEffect(() => {
    if (activeSectionId && activePageId) {
      const pageData = notebook?.sections?.[activeSectionId]?.pages?.[activePageId];
      if (pageData) {
        setDrawSet(pageData.drawSet || []);
        setDrawLength(pageData.drawLength || 0);
        if (p5InstanceRef.current) rebuildBuffer(p5InstanceRef.current);
      } else {
        setDrawSet([]);
        setDrawLength(0);
        if (p5InstanceRef.current) {
          bufferRef.current?.background(255);
          p5InstanceRef.current.background(255);
        }
      }
    }
  }, [activeSectionId, activePageId, notebook]);

  // Update Pages based on active section
  useEffect(() => {
    if (activeSectionId && notebook?.sections?.[activeSectionId]?.pages) {
      const pageList = Object.entries(notebook.sections[activeSectionId].pages).map(([id, val]: any) => ({ id, ...val }));
      setPages(pageList);
      if (!activePageId && pageList.length > 0) {
        setActivePageId(pageList[0].id);
      }
    } else {
      setPages([]);
      setActivePageId(null);
    }
  }, [activeSectionId, notebook]);

  const pushDataToLocal = (newDrawSet: DrawSetItem[], newLength: number) => {
    if (activeSectionId && activePageId && notebook) {
      const updatedNotebook = { ...notebook };
      if (!updatedNotebook.sections[activeSectionId].pages) {
        updatedNotebook.sections[activeSectionId].pages = {};
      }
      updatedNotebook.sections[activeSectionId].pages[activePageId] = {
        ...updatedNotebook.sections[activeSectionId].pages[activePageId],
        drawSet: newDrawSet,
        drawLength: newLength
      };
      setNotebook(updatedNotebook);
      saveNotebookToLocal(updatedNotebook);
    }
  };

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
        canvas.style('touch-action', 'none'); // Prevent scrolling while drawing
        bufferRef.current = s.createGraphics(s.windowWidth, s.windowHeight);
        bufferRef.current.background(255);
        s.background(255);
      };

      s.mousePressed = () => {
        if (s.mouseButton !== s.LEFT) return;
        startPosRef.current = { x: s.mouseX, y: s.mouseY };
      };

      s.draw = () => {
        const { isAuthorized, activeTool, strokeColor, strokeWeight } = toolSettingsRef.current;
        if (!bufferRef.current) return;
        s.image(bufferRef.current, 0, 0);

        if (s.mouseIsPressed && isAuthorized && s.mouseButton === s.LEFT) {
          const x = s.mouseX; const y = s.mouseY;
          s.push();
          if (activeTool === "pencil" || activeTool === "eraser") {
            if (activeTool === "eraser") { s.stroke(255); s.strokeWeight(20); }
            else { s.stroke(strokeColor); s.strokeWeight(strokeWeight); }
            currentPathRef.current.push([x, y, s.pmouseX, s.pmouseY]);
            currentPathRef.current.forEach(e => s.line(e[0], e[1], e[2], e[3]));
          } else {
            s.stroke(strokeColor); s.strokeWeight(strokeWeight); s.noFill();
            if (activeTool === "rect") s.rect(startPosRef.current.x, startPosRef.current.y, x - startPosRef.current.x, y - startPosRef.current.y);
            else if (activeTool === "circle") s.circle(startPosRef.current.x, startPosRef.current.y, s.dist(startPosRef.current.x, startPosRef.current.y, x, y) * 2);
          }
          s.pop();
        }
      };

      s.mouseReleased = () => {
        const { isAuthorized, activeTool, strokeColor, strokeWeight } = toolSettingsRef.current;
        if (!isAuthorized || s.mouseButton !== s.LEFT) return;

        let newDataset: [number, number, number, number][] = [];
        if (activeTool === "pencil" || activeTool === "eraser") {
          if (currentPathRef.current.length === 0) return;
          newDataset = [...currentPathRef.current];
        } else {
          newDataset = [[startPosRef.current.x, startPosRef.current.y, s.mouseX, s.mouseY]];
        }

        const newPath: DrawSetItem = {
          strokeColor: activeTool === "eraser" ? "#FFFFFF" : strokeColor,
          strokeWeight: activeTool === "eraser" ? 20 : strokeWeight,
          tool: activeTool,
          dataset: newDataset,
        };

        const newDrawSet = drawSetRef.current.slice(0, drawLengthRef.current);
        newDrawSet.push(newPath);

        setDrawSet(newDrawSet); setDrawLength(newDrawSet.length);
        pushDataToLocal(newDrawSet, newDrawSet.length);
        currentPathRef.current = [];
        rebuildBuffer(s);
      };

      s.windowResized = () => {
        s.resizeCanvas(s.windowWidth, s.windowHeight);
        bufferRef.current?.resizeCanvas(s.windowWidth, s.windowHeight);
        rebuildBuffer(s);
      };
    });
  };

  useEffect(() => { if ((window as any).p5 && !p5InstanceRef.current) initP5(); }, []);

  const handleCreateSection = () => {
    const title = window.prompt("Section Name:");
    if (title && notebook) {
      const id = "sec_" + Date.now();
      const updatedNotebook = { ...notebook };
      if (!updatedNotebook.sections) updatedNotebook.sections = {};
      updatedNotebook.sections[id] = { sectionName: title, createdOn: Date.now(), pages: {} };
      setNotebook(updatedNotebook);
      saveNotebookToLocal(updatedNotebook);
      setActiveSectionId(id);
    }
  };

  const handleCreatePage = () => {
    const title = window.prompt("Page Name:");
    if (title && activeSectionId && notebook) {
      const id = "page_" + Date.now();
      const updatedNotebook = { ...notebook };
      if (!updatedNotebook.sections[activeSectionId].pages) {
        updatedNotebook.sections[activeSectionId].pages = {};
      }
      updatedNotebook.sections[activeSectionId].pages[id] = { pageName: title, createdOn: Date.now(), drawLength: 0, drawSet: [] };
      setNotebook(updatedNotebook);
      saveNotebookToLocal(updatedNotebook);
      setActivePageId(id);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <main className="h-screen w-screen overflow-hidden bg-white relative selection:none flex">
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js" onLoad={initP5} />

      {/* Sidebar - OneNote Style */}
      <AnimatePresence>
        {isSidebarOpen && isUiVisible && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-72 h-full bg-gray-50 border-r border-gray-200 flex flex-col z-50 shadow-2xl"
          >
            {/* Notebook Header */}
            <div className="p-6 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <Book className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-gray-900 truncate">
                  {notebook?.notebookName || "My Notebook"}
                </h2>
              </div>
              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Digital Whiteboard</p>
            </div>

            {/* Sections */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4 px-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sections</span>
                  <button onClick={handleCreateSection} className="p-1 hover:bg-primary/10 text-primary rounded transition-all">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {sections.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => setActiveSectionId(sec.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all group",
                        activeSectionId === sec.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Folder className="w-4 h-4" />
                        <span className="truncate">{sec.sectionName}</span>
                      </div>
                      <ChevronRight className={cn("w-3 h-3 transition-transform", activeSectionId === sec.id ? "rotate-90" : "")} />
                    </button>
                  ))}
                </div>

                {activeSectionId && (
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pages</span>
                      <button onClick={handleCreatePage} className="p-1 hover:bg-primary/10 text-primary rounded transition-all">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {pages.map((page) => (
                        <button
                          key={page.id}
                          onClick={() => setActivePageId(page.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                            activePageId === page.id ? "bg-white text-primary border border-primary/20 shadow-sm" : "text-gray-500 hover:bg-gray-200"
                          )}
                        >
                          <FileText className="w-4 h-4" />
                          <span className="truncate">{page.pageName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* User Footer */}
            <div className="p-4 bg-white border-t border-gray-200 flex items-center justify-between">
              <Link href="/projects/creative-stuff" className="p-2 text-gray-400 hover:text-primary transition-all">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Tooltip text="Copy Share Link" position="top">
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all">
                  <Share2 className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Drawing Area */}
      <div className="flex-1 relative h-full">
        {/* Navbar (Internal Overlay) */}
        <div className={cn("absolute top-0 left-0 right-0 z-40 transition-all duration-500", isUiVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0")}>
           <Navbar />
        </div>

        {/* Sidebar Toggle */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={cn(
            "fixed left-4 top-24 z-[60] p-3 bg-white border border-gray-200 rounded-xl shadow-xl text-gray-600 hover:bg-primary hover:text-white transition-all",
            !isUiVisible && "hidden"
          )}
        >
          <Layout className="w-5 h-5" />
        </button>

        {/* Floating Tool Sidebar */}
        <div className={cn("fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 p-3 bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/40 transition-all duration-500", isUiVisible ? "translate-x-0" : "translate-x-32")}>
          {[
            { id: 'pencil', icon: MousePointer2, label: 'Pencil Tool' },
            { id: 'eraser', icon: Eraser, label: 'Eraser Tool' },
            { id: 'rect', icon: Square, label: 'Rectangle Shape' },
            { id: 'circle', icon: Circle, label: 'Circle Shape' },
          ].map((tool) => (
            <Tooltip key={tool.id} text={tool.label} position="left">
              <button onClick={() => setActiveTool(tool.id)} className={cn("p-4 rounded-2xl transition-all", activeTool === tool.id ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-gray-500 hover:bg-gray-100")}>
                <tool.icon className="w-6 h-6" />
              </button>
            </Tooltip>
          ))}
          <div className="h-px bg-gray-200 mx-2 my-1" />
          <Tooltip text="Immersive Mode" position="left">
            <button onClick={() => setIsUiVisible(!isUiVisible)} className="p-4 text-gray-500 hover:bg-gray-100 rounded-2xl transition-all">
              <Maximize2 className="w-6 h-6" />
            </button>
          </Tooltip>
        </div>

        {/* Bottom Control Bar */}
        <div className={cn("fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 px-8 py-5 bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/40 transition-all duration-500", isUiVisible ? "translate-y-0 opacity-100" : "translate-y-32 opacity-0")}>
          <div className="flex items-center gap-3 pr-6 border-r border-gray-200">
            <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none p-0 overflow-hidden" />
            <div className="flex flex-wrap gap-1 max-w-[80px]">
              {['#9400D3', '#FF0000', '#0000FF', '#00FF00', '#FFA500', '#000000'].map(c => (
                <button key={c} onClick={() => setStrokeColor(c)} className={cn("w-3 h-3 rounded-full", strokeColor === c ? "ring-2 ring-primary ring-offset-1" : "")} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[120px] px-6 border-r border-gray-200">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{strokeWeight}px</span>
            <input type="range" min="1" max="40" value={strokeWeight} onChange={(e) => setStrokeWeight(parseInt(e.target.value))} className="w-full h-1 bg-gray-100 rounded-full appearance-none cursor-pointer accent-primary" />
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => {
              if (drawLength > 0) {
                const newLen = drawLength - 1;
                setDrawLength(newLen); pushDataToLocal(drawSet, newLen);
              }
            }} disabled={drawLength === 0} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"><Undo2 className="w-4 h-4" /></button>
            <button onClick={() => {
              if (drawLength < drawSet.length) {
                const newLen = drawLength + 1;
                setDrawLength(newLen); pushDataToLocal(drawSet, newLen);
              }
            }} disabled={drawLength === drawSet.length} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"><Redo2 className="w-4 h-4" /></button>
            <button onClick={() => { if (window.confirm("Clear this page?")) { setDrawSet([]); setDrawLength(0); pushDataToLocal([], 0); } }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><RotateCcw className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Immersive Mode Trigger */}
        {!isUiVisible && (
          <button onClick={() => setIsUiVisible(true)} className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] p-4 bg-primary text-white rounded-full shadow-2xl animate-bounce">
            <Move className="w-6 h-6" />
          </button>
        )}

        {/* Canvas Container */}
        <div ref={containerRef} className="w-full h-full cursor-crosshair" />
      </div>

      <style jsx global>{`
        body { overscroll-behavior: none; touch-action: none; overflow: hidden; }
        canvas { touch-action: none; }
      `}</style>
    </main>
  );
}

export default function WhiteboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" /></div>}>
      <WhiteboardContent />
    </Suspense>
  );
}
