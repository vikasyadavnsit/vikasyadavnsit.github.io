"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowLeft, RotateCcw, Undo, Redo, Eraser,
  Square, Circle, Plus, File,
  Download, Settings, Info, Pencil, X,
  Grid, Sun, Moon, Book,
  Trash, ChevronRight, MousePointer2, Move, Maximize, Keyboard,
  LayoutTemplate, Palette
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/components/ThemeContext";
import "./themes.css";

interface DrawSetItem {
  strokeColor: string;
  strokeWeight: number;
  tool: string;
  dataset: [number, number, number, number][];
  timestamp?: number;
}

const Tooltip = ({ children, text, position = "top" }: { children: React.ReactNode, text: string, position?: "top" | "bottom" | "left" | "right" }) => {
  const [show, setShow] = useState(false);
  const positions = {
    top: "-top-10 left-1/2 -translate-x-1/2",
    bottom: "-bottom-10 left-1/2 -translate-x-1/2",
    left: "top-1/2 right-full mr-3 -translate-y-1/2",
    right: "top-1/2 left-full ml-3 -translate-y-1/2"
  };
  return (
    <div className="relative inline-flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: position === "left" ? 5 : (position === "right" ? -5 : 0), y: position === "top" ? 5 : (position === "bottom" ? -5 : 0) }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn("absolute z-[100] px-3 py-1.5 bg-popover text-popover-foreground text-[11px] font-bold rounded-lg shadow-xl pointer-events-none whitespace-nowrap border border-border/50", positions[position])}
          >
            {text}
            <div className={cn(
              "absolute border-4 border-transparent",
              position === "top" && "top-full left-1/2 -translate-x-1/2 border-t-popover",
              position === "bottom" && "bottom-full left-1/2 -translate-x-1/2 border-b-popover",
              position === "left" && "left-full top-1/2 -translate-y-1/2 border-l-popover",
              position === "right" && "right-full top-1/2 -translate-y-1/2 border-r-popover"
            )} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function WhiteboardPage() {
  const router = useRouter();
  const { theme: activeAccent, mode: globalMode } = useTheme();

  const [strokeWeight, setStrokeWeight] = useState(2);
  const [strokeColor, setStrokeColor] = useState("hsl(var(--primary))");
  const [activeTool, setActiveTool] = useState("pencil");
  const [drawSet, setDrawSet] = useState<DrawSetItem[]>([]);
  const [drawLength, setDrawLength] = useState(0);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [appMode, setAppMode] = useState<'edit' | 'view'>('edit');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [manualMode, setManualMode] = useState<"light" | "dark" | null>(null);
  const [isAutoHideEnabled, setIsAutoHideEnabled] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showFocusHint, setShowFocusHint] = useState(false);
  const [hasUserSetColor, setHasUserSetColor] = useState(false);
  const [showThemeWarning, setShowThemeWarning] = useState<"light" | "dark" | null>(null);

  // Creation State
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [newPageName, setNewPageName] = useState("");

  const currentMode = manualMode || globalMode;

  // Sync strokeColor with theme/mode changes - only if user hasn't manually picked a color this session
  useEffect(() => {
    if (hasUserSetColor) return;
    if (currentMode === 'dark') {
      setStrokeColor("hsl(var(--primary))");
    } else {
      setStrokeColor("#000000");
    }
  }, [activeAccent, currentMode, hasUserSetColor]);

  // Load Persistence Settings
  useEffect(() => {
    const saved = localStorage.getItem("whiteboard_settings");
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.strokeColor) {
          setStrokeColor(settings.strokeColor);
          setHasUserSetColor(true);
        }
        if (settings.activeTool) setActiveTool(settings.activeTool);
        if (settings.strokeWeight) setStrokeWeight(settings.strokeWeight);
        if (settings.showGrid !== undefined) setShowGrid(settings.showGrid);
        if (settings.manualMode !== undefined) setManualMode(settings.manualMode);
        if (settings.isAutoHideEnabled !== undefined) setIsAutoHideEnabled(settings.isAutoHideEnabled);
        if (settings.isSidebarOpen !== undefined) setIsSidebarOpen(settings.isSidebarOpen);
      } catch (e) {
        console.error("Failed to load whiteboard settings", e);
      }
    }
  }, []);

  // Save Persistence Settings
  useEffect(() => {
    if (loading) return;
    const settings = {
      strokeColor,
      activeTool,
      strokeWeight,
      showGrid,
      manualMode,
      isAutoHideEnabled,
      isSidebarOpen
    };
    localStorage.setItem("whiteboard_settings", JSON.stringify(settings));
  }, [strokeColor, activeTool, strokeWeight, showGrid, manualMode, isAutoHideEnabled, isSidebarOpen, loading]);

  // Hierarchy State
  const [notebook, setNotebook] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);

  const toolSettingsRef = useRef({ strokeWeight, strokeColor, activeTool, isAuthorized, zoom, offset, appMode, showGrid, mode: currentMode, activeSectionId, activePageId, isAutoHideEnabled, isFocusMode });
  const drawSetRef = useRef<DrawSetItem[]>([]);
  const drawLengthRef = useRef(0);
  const currentPathRef = useRef<[number, number, number, number][]>([]);
  const startPosRef = useRef({ x: 0, y: 0 });
  const p5InstanceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    toolSettingsRef.current = { strokeWeight, strokeColor, activeTool, isAuthorized, zoom, offset, appMode, showGrid, mode: currentMode, activeSectionId, activePageId, isAutoHideEnabled, isFocusMode };
  }, [strokeWeight, strokeColor, activeTool, isAuthorized, zoom, offset, appMode, showGrid, currentMode, activeSectionId, activePageId, isAutoHideEnabled, isFocusMode]);

  useEffect(() => {
    drawSetRef.current = drawSet;
    drawLengthRef.current = drawLength;
  }, [drawSet, drawLength]);

  const saveNotebookToLocal = (data: any) => {
    localStorage.setItem("whiteboard_notebook", JSON.stringify(data));
  };

  const getNotebookFromLocal = () => {
    const saved = localStorage.getItem("whiteboard_notebook");
    if (saved) return JSON.parse(saved);
    return { notebookName: "My Notebook", sections: {} };
  };

  // Initial Load
  useEffect(() => {
    const initialize = () => {
      let data = getNotebookFromLocal();
      if (!data.sections || Object.keys(data.sections).length === 0) {
        const defaultSecId = "sec_" + Date.now();
        const defaultPageId = "page_" + (Date.now() + 1);
        data = {
          notebookName: "OneNote Node",
          sections: {
            [defaultSecId]: {
              sectionName: "General",
              createdOn: Date.now(),
              pages: {
                [defaultPageId]: {
                  pageName: "Main Page",
                  createdOn: Date.now(),
                  drawLength: 0,
                  drawSet: []
                }
              }
            }
          }
        };
        saveNotebookToLocal(data);
      }
      setNotebook(data);
      const memSection = localStorage.getItem("whiteboard_last_section");
      const memPage = localStorage.getItem("whiteboard_last_page");
      if (data.sections) {
        const secList = Object.entries(data.sections).filter(([id, val]: any) => val !== null).map(([id, val]: any) => ({ id, ...val }));
        setSections(secList);
        let finalSectionId = (memSection && data.sections[memSection]) ? memSection : (secList.length > 0 ? secList[0].id : null);
        let finalPageId = null;
        if (finalSectionId && data.sections[finalSectionId].pages) {
          finalPageId = (memPage && data.sections[finalSectionId].pages[memPage]) ? memPage : Object.keys(data.sections[finalSectionId].pages)[0];
        }
        setActiveSectionId(finalSectionId);
        setActivePageId(finalPageId);
      }
      setLoading(false);
    };
    initialize();
  }, []);

  useEffect(() => {
    if (!notebook) return;
    if (notebook.sections) {
      const secList = Object.entries(notebook.sections).filter(([id, val]: any) => val !== null).map(([id, val]: any) => ({ id, ...val, sectionName: val.sectionName || "Untitled" }));
      setSections(secList);
      let targetSectionId = activeSectionId || (secList.length > 0 ? secList[0].id : null);
      if (targetSectionId && notebook?.sections?.[targetSectionId]) {
        setActiveSectionId(targetSectionId);
        const sectionData = notebook.sections[targetSectionId];
        if (sectionData?.pages) {
          const pageList = Object.entries(sectionData.pages).filter(([id, val]: any) => val !== null).map(([id, val]: any) => ({ id, ...val, pageName: val.pageName || "Untitled" }));
          setPages(pageList);
          let targetPageId = activePageId;
          if (targetPageId && sectionData.pages[targetPageId]) {
            setActivePageId(targetPageId);
          } else if (pageList.length > 0 && !activePageId) {
            setActivePageId(pageList[0].id);
          }
        } else {
          setPages([]);
          setActivePageId(null);
        }
      }
    }
  }, [notebook, activeSectionId, activePageId]);

  useEffect(() => {
    if (!notebook || !activeSectionId || !activePageId) {
      setDrawSet([]); setDrawLength(0); return;
    }
    const pageData = notebook.sections?.[activeSectionId]?.pages?.[activePageId];
    if (pageData) {
      setDrawSet(pageData.drawSet || []);
      setDrawLength(pageData.drawLength || 0);
    } else {
      setDrawSet([]); setDrawLength(0);
    }
  }, [activeSectionId, activePageId, notebook]);

  useEffect(() => {
    if (activeSectionId) localStorage.setItem("whiteboard_last_section", activeSectionId);
    if (activePageId) localStorage.setItem("whiteboard_last_page", activePageId);
  }, [activeSectionId, activePageId]);

  const pushDataLocally = (newDrawSet: DrawSetItem[], newLength: number) => {
    const { activeSectionId: sid, activePageId: pid } = toolSettingsRef.current;
    if (!sid || !pid) return;
    setNotebook((prev: any) => {
      const updated = { ...prev };
      if (!updated.sections) updated.sections = {};
      if (!updated.sections[sid]) updated.sections[sid] = { pages: {} };
      const section = { ...updated.sections[sid] };
      if (!section.pages) section.pages = {};
      section.pages[pid] = { ...(section.pages[pid] || {}), drawSet: newDrawSet, drawLength: newLength };
      updated.sections[sid] = section;
      saveNotebookToLocal(updated);
      return updated;
    });
  };

  const screenToWorld = (sx: number, sy: number, currentOffset: {x: number, y: number}, currentZoom: number) => ({
    x: (sx - currentOffset.x) / currentZoom,
    y: (sy - currentOffset.y) / currentZoom
  });

  const initP5 = () => {
    const p5 = (window as any).p5;
    if (!p5 || p5InstanceRef.current) return;
    new p5((s: any) => {
      p5InstanceRef.current = s;
      s.setup = () => {
        const canvas = s.createCanvas(s.windowWidth, s.windowHeight);
        if (containerRef.current) canvas.parent(containerRef.current);
        canvas.style('display', 'block');
        canvas.style('touch-action', 'none');
      };
      s.draw = () => {
        const { zoom, offset, showGrid, mode } = toolSettingsRef.current;
        // Use theme-consistent background colors
        if (mode === 'dark') {
          s.background(10, 10, 15); // Deep Obsidian
        } else {
          s.background(255, 255, 255); // Pure Pro White
        }

        if (showGrid) {
          s.stroke(mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)');
          s.strokeWeight(1 / zoom);
          const gridSize = 50;
          const startX = Math.floor((-offset.x / zoom) / gridSize) * gridSize;
          const startY = Math.floor((-offset.y / zoom) / gridSize) * gridSize;
          s.push(); s.translate(offset.x, offset.y); s.scale(zoom);
          for (let x = startX; x < startX + s.width / zoom + gridSize; x += gridSize) s.line(x, -offset.y/zoom, x, (s.height - offset.y)/zoom);
          for (let y = startY; y < startY + s.height / zoom + gridSize; y += gridSize) s.line(-offset.x/zoom, y, (s.width - offset.x)/zoom, y);
          s.pop();
        }
        s.push(); s.translate(offset.x, offset.y); s.scale(zoom);
        for (let i = 0; i < drawLengthRef.current; i++) {
          const data = drawSetRef.current[i];
          s.stroke(data.strokeColor); s.strokeWeight(data.strokeWeight);
          if (data.tool === "pencil" || data.tool === "eraser") {
            data.dataset.forEach((e: any) => s.line(e[0], e[1], e[2], e[3]));
          } else if (data.tool === "rect") {
            const [x1, y1, x2, y2] = data.dataset[0]; s.noFill(); s.rect(x1, y1, x2 - x1, y2 - y1);
          } else if (data.tool === "circle") {
            const [x1, y1, x2, y2] = data.dataset[0]; s.noFill(); s.circle(x1, y1, s.dist(x1, y1, x2, y2) * 2);
          }
        }
        if (s.mouseIsPressed && s.mouseButton === s.LEFT && isAuthorized && toolSettingsRef.current.appMode === 'edit') {
          const { activeTool, strokeColor, strokeWeight } = toolSettingsRef.current;
          const eraserColor = mode === 'dark' ? "rgb(10,10,15)" : "rgb(255,255,255)";
          s.stroke(activeTool === "eraser" ? eraserColor : strokeColor);
          s.strokeWeight(activeTool === "eraser" ? 20 : strokeWeight);
          if (activeTool === "pencil" || activeTool === "eraser") {
            currentPathRef.current.forEach(e => s.line(e[0], e[1], e[2], e[3]));
          } else {
            s.noFill();
            const worldMouse = screenToWorld(s.mouseX, s.mouseY, offset, zoom);
            if (activeTool === "rect") s.rect(startPosRef.current.x, startPosRef.current.y, worldMouse.x - startPosRef.current.x, worldMouse.y - startPosRef.current.y);
            else if (activeTool === "circle") s.circle(startPosRef.current.x, startPosRef.current.y, s.dist(startPosRef.current.x, startPosRef.current.y, worldMouse.x, worldMouse.y) * 2);
          }
        }
        s.pop();
      };
      s.mousePressed = (event: MouseEvent) => {
        // Only trigger drawing/focus if clicking directly on the canvas
        // This prevents the UI from hiding when clicking buttons or sidebars
        if (event && event.target && (event.target as HTMLElement).tagName !== 'CANVAS') return;

        if (s.mouseButton === s.CENTER || (s.mouseButton === s.LEFT && s.keyIsDown(32))) return;
        if (s.mouseButton !== s.LEFT || toolSettingsRef.current.appMode !== 'edit') return;
        const { offset, zoom, isAutoHideEnabled, isFocusMode: currentlyInFocus } = toolSettingsRef.current;
        const worldMouse = screenToWorld(s.mouseX, s.mouseY, offset, zoom);
        startPosRef.current = { x: worldMouse.x, y: worldMouse.y };
        currentPathRef.current = [];

        if (isAutoHideEnabled && !currentlyInFocus) {
          setIsFocusMode(true);
          setShowFocusHint(true);
          setTimeout(() => setShowFocusHint(false), 5000);
        }
      };
      s.mouseDragged = () => {
        const { offset, zoom, activeTool, appMode } = toolSettingsRef.current;
        if (s.mouseButton === s.CENTER || (s.mouseButton === s.LEFT && s.keyIsDown(32)) || appMode === 'view') {
          setOffset({ x: offset.x + (s.mouseX - s.pmouseX), y: offset.y + (s.mouseY - s.pmouseY) });
          return;
        }
        if (s.mouseButton === s.LEFT && appMode === 'edit') {
          const worldMouse = screenToWorld(s.mouseX, s.mouseY, offset, zoom);
          const pWorldMouse = screenToWorld(s.pmouseX, s.pmouseY, offset, zoom);
          if (activeTool === "pencil" || activeTool === "eraser") {
            currentPathRef.current.push([worldMouse.x, worldMouse.y, pWorldMouse.x, pWorldMouse.y]);
          }
        }
      };
      s.mouseReleased = () => {
        const { isAuthorized, activeTool, strokeColor, strokeWeight, offset, zoom, appMode, mode } = toolSettingsRef.current;
        if (!isAuthorized || s.mouseButton !== s.LEFT || s.keyIsDown(32) || appMode !== 'edit') return;
        const worldMouse = screenToWorld(s.mouseX, s.mouseY, offset, zoom);
        let newDataset: [number, number, number, number][] = [];
        if (activeTool === "pencil" || activeTool === "eraser") {
          if (currentPathRef.current.length === 0) return;
          newDataset = [...currentPathRef.current];
        } else {
          newDataset = [[startPosRef.current.x, startPosRef.current.y, worldMouse.x, worldMouse.y]];
        }
        const eraserColor = mode === 'dark' ? "rgb(10,10,15)" : "rgb(255,255,255)";
        const newPath: DrawSetItem = {
          strokeColor: activeTool === "eraser" ? eraserColor : strokeColor,
          strokeWeight: activeTool === "eraser" ? 20 : strokeWeight,
          tool: activeTool, dataset: newDataset,
        };
        const newDrawSet = drawSetRef.current.slice(0, drawLengthRef.current);
        newDrawSet.push(newPath);
        setDrawSet(newDrawSet); setDrawLength(newDrawSet.length);
        pushDataLocally(newDrawSet, newDrawSet.length);
        currentPathRef.current = [];
      };
      s.mouseWheel = (event: any) => {
        const { offset, zoom } = toolSettingsRef.current;
        const sensitivity = 0.001;
        const mouseBeforeZoom = screenToWorld(s.mouseX, s.mouseY, offset, zoom);
        const newZoom = s.constrain(zoom - event.delta * sensitivity, 0.1, 5);
        const mouseAfterZoom = screenToWorld(s.mouseX, s.mouseY, offset, newZoom);
        setZoom(newZoom);
        setOffset({ x: offset.x + (mouseAfterZoom.x - mouseBeforeZoom.x) * newZoom, y: offset.y + (mouseAfterZoom.y - mouseBeforeZoom.y) * newZoom });
        return false;
      };
      s.windowResized = () => {
        const oldW = s.width;
        const oldH = s.height;
        s.resizeCanvas(s.windowWidth, s.windowHeight);
        setOffset(prev => ({
          x: prev.x + (s.windowWidth - oldW) / 2,
          y: prev.y + (s.windowHeight - oldH) / 2
        }));
      };
    });
  };

  const handleSaveSection = () => {
    if (newSectionName.trim()) {
      const id = "sec_" + Date.now();
      const firstPageId = "page_" + (Date.now() + 1);
      setNotebook((prev: any) => {
        const updated = { ...prev }; if (!updated.sections) updated.sections = {};
        updated.sections[id] = { sectionName: newSectionName.trim(), createdOn: Date.now(), pages: { [firstPageId]: { pageName: "Main Page", createdOn: Date.now(), drawLength: 0, drawSet: [] } } };
        saveNotebookToLocal(updated); return updated;
      });
      setActiveSectionId(id); setActivePageId(firstPageId);
      setNewSectionName(""); setIsCreatingSection(false);
    } else { setIsCreatingSection(false); }
  };

  const handleSavePage = () => {
    if (newPageName.trim() && activeSectionId) {
      const id = "page_" + Date.now();
      setNotebook((prev: any) => {
        const updated = { ...prev };
        if (!updated.sections[activeSectionId].pages) updated.sections[activeSectionId].pages = {};
        updated.sections[activeSectionId].pages[id] = { pageName: newPageName.trim(), createdOn: Date.now(), drawLength: 0, drawSet: [] };
        saveNotebookToLocal(updated); return updated;
      });
      setActivePageId(id); setNewPageName(""); setIsCreatingPage(false);
    } else { setIsCreatingPage(false); }
  };

  const handleDownload = () => {
    if (!p5InstanceRef.current || !activeSectionId || !activePageId) return;
    const s = p5InstanceRef.current;
    const currentSection = sections.find(sec => sec.id === activeSectionId);
    const currentPage = pages.find(p => p.id === activePageId);
    const fileName = `${currentSection?.sectionName || "Section"}_${currentPage?.pageName || "Page"}`;
    if (drawLengthRef.current === 0) { s.saveCanvas(fileName, 'png'); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < drawLengthRef.current; i++) {
      const data = drawSetRef.current[i];
      if (data.tool === "pencil" || data.tool === "eraser") {
        data.dataset.forEach(e => { minX = Math.min(minX, e[0], e[2]); minY = Math.min(minY, e[1], e[3]); maxX = Math.max(maxX, e[0], e[2]); maxY = Math.max(maxY, e[1], e[3]); });
      } else {
        const [x1, y1, x2, y2] = data.dataset[0];
        minX = Math.min(minX, x1, x2); maxX = Math.max(maxX, x1, x2); minY = Math.min(minY, y1, y2); maxY = Math.max(maxY, y1, y2);
      }
    }
    const padding = 50; minX -= padding; minY -= padding; maxX += padding; maxY += padding;
    const scale = 2; const pg = s.createGraphics((maxX - minX) * scale, (maxY - minY) * scale);
    pg.scale(scale); pg.translate(-minX, -minY);
    const bgColor = currentMode === 'dark' ? "rgb(10,10,15)" : "rgb(255,255,255)";
    pg.background(bgColor);
    for (let i = 0; i < drawLengthRef.current; i++) {
      const data = drawSetRef.current[i]; pg.stroke(data.strokeColor); pg.strokeWeight(data.strokeWeight);
      if (data.tool === "pencil" || data.tool === "eraser") data.dataset.forEach((e: any) => pg.line(e[0], e[1], e[2], e[3]));
      else if (data.tool === "rect") { const [x1, y1, x2, y2] = data.dataset[0]; pg.noFill(); pg.rect(x1, y1, x2 - x1, y2 - y1); }
      else if (data.tool === "circle") { const [x1, y1, x2, y2] = data.dataset[0]; pg.noFill(); pg.circle(x1, y1, s.dist(x1, y1, x2, y2) * 2); }
    }
    s.save(pg, fileName, 'png'); pg.remove();
  };

  const handleThemeChange = (newMode: "light" | "dark" | null) => {
    if (newMode !== manualMode) {
      setShowThemeWarning(newMode);
    }
  };

  const confirmThemeChange = () => {
    if (showThemeWarning !== null) {
      setManualMode(showThemeWarning);
      setIsFocusMode(false); // Show menu on theme change
      setShowFocusHint(false); // Ensure hint doesn't show from state change
      setShowThemeWarning(null);
    }
  };

  const handleResetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    if (toolSettingsRef.current) {
      toolSettingsRef.current.zoom = 1;
      toolSettingsRef.current.offset = { x: 0, y: 0 };
    }
  };

  const handleDeleteSection = (id: string) => {
    if (!window.confirm("Delete this section and all its pages?")) return;
    setNotebook((prev: any) => {
      const updated = { ...prev }; if (updated.sections) delete updated.sections[id];
      saveNotebookToLocal(updated);
      const newSections = Object.entries(updated.sections || {}).map(([id, val]: any) => ({ id, ...val }));
      if (activeSectionId === id) setActiveSectionId(newSections.length > 0 ? newSections[0].id : null);
      return updated;
    });
  };

  const handleDeletePage = (sectionId: string, pageId: string) => {
    if (!window.confirm("Delete this page?")) return;
    setNotebook((prev: any) => {
      const updated = { ...prev }; if (updated.sections?.[sectionId]?.pages) delete updated.sections[sectionId].pages[pageId];
      saveNotebookToLocal(updated);
      if (activeSectionId === sectionId) {
        const newPages = Object.entries(updated.sections[sectionId].pages || {}).map(([id, val]: any) => ({ id, ...val }));
        if (activePageId === pageId) setActivePageId(newPages.length > 0 ? newPages[0].id : null);
      }
      return updated;
    });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  const isUIHidden = isFocusMode && isAutoHideEnabled;

  return (
    <main className={cn(
      "h-screen w-screen overflow-hidden flex flex-col font-sans text-foreground transition-colors duration-700",
      currentMode === 'dark' ? "wb-theme-dark bg-[hsl(var(--wb-background))]" : "wb-theme-light bg-[hsl(var(--wb-background))]"
    )}>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js" onLoad={initP5} />

      {/* Persistent Canvas Container */}
      <div ref={containerRef} className="fixed inset-0 z-0" />

      {/* Theme Warning Modal */}
      <AnimatePresence>
        {showThemeWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("fixed inset-0 z-[400] backdrop-blur-md flex items-center justify-center p-4", currentMode === 'dark' ? "bg-black/60" : "bg-slate-500/10")}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="w-full max-w-sm rounded-[2.5rem] overflow-hidden wb-glass-card p-8 space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                <Sun className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Switch Theme?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Changing to {showThemeWarning} theme might make some current marker colors hard to see on the new background.
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <button onClick={confirmThemeChange} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-sm uppercase tracking-widest hover:scale-[1.02] transition-all">Confirm Switch</button>
                <button onClick={() => setShowThemeWarning(null)} className="w-full py-4 bg-muted text-foreground rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-foreground/10 transition-all">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("fixed inset-0 z-[300] backdrop-blur-md flex items-center justify-center p-4", currentMode === 'dark' ? "bg-black/60" : "bg-slate-500/10")} onClick={() => setIsSettingsOpen(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="w-full max-w-md rounded-[2.5rem] overflow-hidden wb-glass-card p-8 space-y-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between"><h3 className="text-2xl font-bold tracking-tight text-foreground">Settings</h3><button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors text-foreground"><X className="w-6 h-6" /></button></div>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded-3xl border border-border">
                  <div className="flex items-center gap-4"><Sun className="w-5 h-5 text-primary" /><div><p className="text-sm font-bold text-foreground">Theme Mode</p><p className="text-[10px] text-foreground opacity-60 uppercase tracking-widest">Manual override</p></div></div>
                  <div className="flex p-1 bg-background/50 rounded-2xl border border-border">
                    {[ { id: 'light', icon: Sun }, { id: 'dark', icon: Moon }, { id: null, icon: LayoutTemplate } ].map(t => (
                      <button key={t.id as string} onClick={() => handleThemeChange(t.id as any)} className={cn("p-2 rounded-xl transition-all", manualMode === t.id ? "bg-primary text-primary-foreground shadow-lg" : "text-foreground opacity-60 hover:opacity-100 hover:text-foreground")}><t.icon className="w-4 h-4" /></button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-3xl border border-border">
                  <div className="flex items-center gap-4"><Maximize className="w-5 h-5 text-primary" /><div><p className="text-sm font-bold text-foreground">Auto-Hide UI</p><p className="text-[10px] text-foreground opacity-60 uppercase tracking-widest">Hide when drawing</p></div></div>
                  <button onClick={() => setIsAutoHideEnabled(!isAutoHideEnabled)} className={cn("w-12 h-6 rounded-full transition-all relative", isAutoHideEnabled ? "bg-primary" : "bg-muted")}><div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", isAutoHideEnabled ? "left-7" : "left-1")} /></button>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-3xl border border-border">
                   <div className="flex items-center gap-4"><Grid className="w-5 h-5 text-primary" /><div><p className="text-sm font-bold text-foreground">Background Grid</p><p className="text-[10px] text-foreground opacity-60 uppercase tracking-widest">Toggle grid lines</p></div></div>
                   <button onClick={() => setShowGrid(!showGrid)} className={cn("w-12 h-6 rounded-full transition-all relative", showGrid ? "bg-primary" : "bg-muted")}><div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", showGrid ? "left-7" : "left-1")} /></button>
                </div>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="w-full py-4 bg-primary text-primary-foreground rounded-3xl font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.02] transition-all shadow-xl shadow-primary/20">Done</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <AnimatePresence>
        {isHelpOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("fixed inset-0 z-[300] backdrop-blur-md flex items-center justify-center p-4", currentMode === 'dark' ? "bg-black/60" : "bg-slate-500/10")} onClick={() => setIsHelpOpen(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="w-full max-w-md rounded-[2.5rem] overflow-hidden wb-glass-card p-8 space-y-8" onClick={e => e.stopPropagation()}>
               <div className="flex items-center justify-between"><h3 className="text-2xl font-bold tracking-tight text-foreground">Commands</h3><button onClick={() => setIsHelpOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors text-foreground"><X className="w-6 h-6" /></button></div>
               <div className="grid gap-4">
                  {[
                    { cmd: "Left Click", desc: "Draw on canvas", icon: MousePointer2 },
                    { cmd: "Space + Drag", desc: "Pan the whiteboard", icon: Move },
                    { cmd: "Mouse Wheel", desc: "Zoom In/Out", icon: Maximize },
                    { cmd: "Ctrl + Z", desc: "Undo last stroke", icon: Undo },
                    { cmd: "Ctrl + Y", desc: "Redo last stroke", icon: Redo },
                  ].map(h => (
                    <div key={h.cmd} className="flex items-center gap-4 p-4 bg-muted rounded-3xl border border-border">
                       <div className="p-2 bg-primary/10 rounded-xl text-primary"><h.icon className="w-5 h-5" /></div>
                       <div><p className="text-sm font-bold text-foreground">{h.cmd}</p><p className="text-xs text-foreground opacity-60">{h.desc}</p></div>
                    </div>
                  ))}
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <AnimatePresence>
        {!isUIHidden && (
          <motion.header initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="fixed top-4 md:top-6 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none transition-all">
            <div className="flex items-center gap-2 md:gap-4 p-1.5 md:p-2 bg-background/80 backdrop-blur-3xl border border-border rounded-full shadow-2xl pointer-events-auto wb-glass-card">
              <div className="flex items-center gap-1.5 md:gap-3 px-2 md:px-3">
                <Link href="/projects/creative-stuff" className="hover:bg-foreground/5 p-2 md:p-2.5 rounded-full transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
                <div className="hidden sm:flex items-center gap-2 text-foreground font-black"><Book className="w-4 h-4 text-primary" /><span className="text-xs tracking-widest uppercase truncate max-w-[150px]">{notebook?.notebookName || "OneNote"}</span></div>
              </div>
              <div className="w-px h-6 bg-border" />
              <nav className="flex items-center gap-1">
                {[ { label: 'File', active: isSidebarOpen, onClick: () => setIsSidebarOpen(!isSidebarOpen) }, { label: 'Draw', active: appMode === 'edit', onClick: () => setAppMode('edit') }, { label: 'View', active: appMode === 'view', onClick: () => setAppMode('view') } ].map((item) => (
                  <button key={item.label} onClick={item.onClick} className={cn("px-2.5 md:px-5 py-2 md:py-2.5 text-[9px] md:text-[10px] font-black rounded-full transition-all uppercase tracking-[0.1em] md:tracking-[0.15em]", item.active ? "bg-foreground text-background shadow-lg" : "hover:bg-foreground/5 text-foreground opacity-60 hover:opacity-100")}>{item.label}</button>
                ))}
              </nav>
              <div className="w-px h-6 bg-border mx-0.5 md:mx-1" />
              <div className="flex items-center gap-1 px-1">
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 md:p-3 hover:bg-foreground/5 rounded-full text-foreground opacity-60 hover:opacity-100 transition-all"><Settings className="w-4 h-4" /></button>
                <button onClick={handleDownload} className="flex items-center gap-2 px-3 md:px-6 py-2 md:py-2.5 bg-primary text-primary-foreground rounded-full transition-all text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 shadow-xl shadow-primary/20"><Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export</span></button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Focus Mode Restorer Icon */}
      <AnimatePresence>
        {isUIHidden && (
          <>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="fixed left-8 top-8 z-[200]"
            >
              <Tooltip text="Show Menu" position="right">
                <button
                  onClick={() => setIsFocusMode(false)}
                  className="p-4 wb-glass-card rounded-full text-primary shadow-2xl hover:scale-110 transition-all border border-primary/20 hover:animate-shake"
                >
                  <Maximize className="w-6 h-6" />
                </button>
              </Tooltip>
            </motion.div>

            {showFocusHint && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-popover text-popover-foreground rounded-2xl border border-border shadow-2xl pointer-events-none"
              >
                <p className="text-xs font-bold tracking-wide flex items-center gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  UI Hidden. Use the top-left icon to <span className="text-primary">Show Menu</span>.
                </p>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden relative z-10 pointer-events-none">
        {/* Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && !isUIHidden && (
            <motion.aside initial={{ x: -400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -400, opacity: 0 }} className="absolute left-4 md:left-8 top-20 md:top-28 bottom-4 md:bottom-8 w-[calc(100vw-2rem)] md:w-[24rem] z-40 wb-glass-card rounded-[2.5rem] md:rounded-[3.5rem] flex flex-col overflow-hidden shadow-2xl border-none pointer-events-auto">
              <div className="flex-1 flex overflow-hidden pointer-events-auto">
                <div className="w-32 md:w-40 flex flex-col border-r border-border bg-foreground/5">
                  <div className="p-6 text-[10px] font-black text-foreground opacity-40 uppercase tracking-[0.3em] flex items-center justify-between"><span>Sections</span><button onClick={() => setIsCreatingSection(true)} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-all"><Plus className="w-4 h-4" /></button></div>
                  <div className="flex-1 overflow-y-auto px-3 space-y-2 scrollbar-hide">
                    {isCreatingSection && <input autoFocus type="text" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSection(); if (e.key === 'Escape') setIsCreatingSection(false); }} onBlur={handleSaveSection} placeholder="..." className="w-full text-sm px-4 py-3 bg-background border border-primary rounded-2xl outline-none" />}
                    {sections.map((sec) => (
                      <div key={sec.id} className="group relative">
                        <button onClick={() => { setActiveSectionId(sec.id); const fp = sec.pages ? Object.keys(sec.pages)[0] : null; if (fp) setActivePageId(fp); }} className={cn("w-full text-left px-5 pr-12 py-5 rounded-[2rem] transition-all relative overflow-hidden", activeSectionId === sec.id ? "bg-primary text-primary-foreground shadow-2xl scale-[1.02] z-10" : "text-foreground opacity-60 hover:bg-foreground/5 hover:opacity-100")}>
                           <div className="flex flex-col gap-1.5"><span className="text-sm font-black tracking-tight truncate leading-none">{sec.sectionName}</span><span className={cn("text-[10px] font-bold opacity-60", activeSectionId === sec.id ? "text-white" : "text-foreground opacity-40")}>{new Date(sec.createdOn).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSection(sec.id); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-destructive/10 text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-white shadow-sm hover:scale-110 active:scale-90 z-20">
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 flex flex-col bg-foreground/5">
                  <div className="p-6 text-[10px] font-black text-foreground opacity-40 uppercase tracking-[0.3em] flex items-center justify-between"><span>Pages</span><button onClick={() => setIsCreatingPage(true)} className="text-primary hover:bg-primary/5 p-2 rounded-full transition-all"><Plus className="w-4 h-4" /></button></div>
                  <div className="flex-1 overflow-y-auto px-4 space-y-2 scrollbar-hide">
                    {isCreatingPage && <input autoFocus type="text" value={newPageName} onChange={(e) => setNewPageName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSavePage(); if (e.key === 'Escape') setIsCreatingPage(false); }} onBlur={handleSavePage} placeholder="..." className="w-full text-sm px-4 py-3 bg-background border border-primary rounded-2xl outline-none" />}
                    {pages.map((p) => (
                      <div key={p.id} className="group relative">
                        <button onClick={() => setActivePageId(p.id)} className={cn("w-full text-left px-5 py-6 rounded-[2rem] transition-all flex items-start gap-4 border border-transparent", activePageId === p.id ? "bg-primary/10 text-primary border-primary/20 shadow-sm" : "text-foreground opacity-60 hover:bg-foreground/5 hover:opacity-100")}>
                          <File className={cn("w-5 h-5 mt-0.5 shrink-0", activePageId === p.id ? "text-primary" : "opacity-30")} />
                          <div className="flex flex-col min-w-0 gap-1.5"><span className="text-sm font-black truncate leading-none tracking-tight">{p.pageName}</span><span className="text-[10px] font-bold opacity-60">{new Date(p.createdOn).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeletePage(activeSectionId!, p.id); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-destructive/10 text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive hover:text-white shadow-sm hover:scale-110 active:scale-90">
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-border/50 flex items-center justify-between bg-foreground/5">
                <div className="flex items-center gap-5 text-foreground opacity-40"><Settings className="w-5 h-5 cursor-pointer hover:text-primary hover:opacity-100 transition-all" onClick={() => setIsSettingsOpen(true)} /><Info className="w-5 h-5 cursor-pointer hover:text-primary hover:opacity-100 transition-all" onClick={() => setIsHelpOpen(true)} /></div>
                <div className="text-[9px] font-black tracking-[0.4em] opacity-30 uppercase text-foreground">Local Node</div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Restore Sidebar Button (If sidebar closed but UI NOT hidden) */}
        {!isSidebarOpen && !isUIHidden && (
          <button onClick={() => setIsSidebarOpen(true)} className="fixed left-4 md:left-8 top-1/2 -translate-y-1/2 z-50 p-5 md:p-5 glass-card rounded-full text-primary shadow-2xl hover:scale-110 transition-all border border-primary/10 pointer-events-auto"><ChevronRight className="w-6 md:w-6 h-6 md:h-6" /></button>
        )}

        <div className="flex-1 relative overflow-visible pointer-events-none">
          {/* Tools Toolbar */}
          <AnimatePresence>
            {appMode === 'edit' && !isUIHidden && (
              <motion.div initial={{ x: 150, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 150, opacity: 0 }} className="absolute top-20 md:top-28 bottom-4 md:bottom-8 right-4 md:right-8 z-40 p-2.5 md:p-3 wb-glass-card rounded-[2.5rem] md:rounded-[3.5rem] flex flex-col items-center gap-3 md:gap-4 shadow-2xl border-none pointer-events-auto overflow-visible">
                <div className="flex flex-col gap-2 md:gap-2">
                  {[ { id: 'pencil', icon: Pencil, l: 'Pen' }, { id: 'eraser', icon: Eraser, l: 'Eraser' }, { id: 'rect', icon: Square, l: 'Shape' }, { id: 'circle', icon: Circle, l: 'Circle' } ].map((t) => (
                    <Tooltip key={t.id} text={t.l} position="left">
                      <button onClick={() => setActiveTool(t.id)} className={cn("p-4 md:p-3.5 rounded-[1.2rem] transition-all relative group shadow-sm", activeTool === t.id ? "bg-primary text-primary-foreground shadow-2xl scale-110" : "text-foreground opacity-60 hover:bg-foreground/5 hover:opacity-100 hover:text-foreground")}>
                        <t.icon className="w-5 md:w-5 h-5 md:h-5" />
                      </button>
                    </Tooltip>
                  ))}
                </div>
                <div className="w-10 h-px bg-border opacity-50" />
                <div className="grid grid-cols-2 gap-3 md:gap-2.5 px-1">
                  {[
                    'hsl(var(--primary))',
                    currentMode === 'dark' ? '#FFFFFF' : '#000000',
                    '#FF3B30',
                    '#34C759',
                    '#007AFF',
                    '#FF9500',
                    '#AF52DE',
                    '#5856D6',
                  ].map(c => (
                    <button key={c} onClick={() => { setStrokeColor(c); setHasUserSetColor(true); }} className={cn("w-8 md:w-7 h-8 md:h-7 rounded-full border-2 transition-all hover:scale-125 shadow-md", strokeColor === c ? "border-foreground scale-125 ring-2 ring-primary/40" : "border-transparent")} style={{ backgroundColor: c }} />
                  ))}
                  <div className="col-span-2 flex justify-center pt-1">
                    <div className="relative group">
                      <input
                        type="color"
                        value={strokeColor.startsWith('#') ? strokeColor : '#000000'}
                        onChange={(e) => { setStrokeColor(e.target.value); setHasUserSetColor(true); }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className={cn(
                        "w-9 md:w-8 h-9 md:h-8 rounded-full flex items-center justify-center border-2 transition-all group-hover:scale-110 shadow-md bg-muted text-foreground",
                        !['hsl(var(--primary))', '#FFFFFF', '#000000', '#FF3B30', '#34C759', '#007AFF', '#FF9500', '#AF52DE', '#5856D6'].includes(strokeColor) ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                      )}>
                        <Palette className="w-4 md:w-4 h-4 md:h-4" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-10 h-px bg-border opacity-50" />
                <div className="flex flex-col gap-1.5 md:gap-1">
                  <Tooltip text="Undo" position="left"><button onClick={() => { if (drawLength > 0) { const nl = drawLength - 1; setDrawLength(nl); pushDataLocally(drawSet, nl); } }} disabled={drawLength === 0} className="p-4 md:p-3.5 text-foreground opacity-60 hover:opacity-100 hover:text-foreground disabled:opacity-20 transition-all"><Undo className="w-5 h-5" /></button></Tooltip>
                  <Tooltip text="Redo" position="left"><button onClick={() => { if (drawLength < drawSet.length) { const nl = drawLength + 1; setDrawLength(nl); pushDataLocally(drawSet, nl); } }} disabled={drawLength === drawSet.length} className="p-4 md:p-4 text-foreground opacity-60 hover:opacity-100 hover:text-foreground disabled:opacity-20 transition-all"><Redo className="w-5 h-5" /></button></Tooltip>
                  <Tooltip text="Clear" position="left"><button onClick={() => { if (window.confirm("Clear this page?")) { setDrawSet([]); setDrawLength(0); pushDataLocally([], 0); } }} className="p-5 md:p-4 text-destructive hover:scale-110 transition-all"><RotateCcw className="w-5 h-5" /></button></Tooltip>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Center Zoom Panel - Bottom Center */}
          <AnimatePresence>
            {!isUIHidden && (
              <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-40 transition-all pointer-events-auto scale-90 md:scale-100">
                <div className="flex items-center gap-3 md:gap-6 p-2 md:p-3 wb-glass-card rounded-full shadow-2xl border-none">
                   <button onClick={() => setZoom(Math.max(0.1, zoom - 0.25))} className="w-10 md:w-12 h-10 md:h-12 flex items-center justify-center hover:bg-foreground/10 rounded-full text-2xl md:text-3xl font-light text-foreground/70 transition-all leading-none pb-1 hover:text-primary">-</button>
                   <div className="flex flex-col items-center min-w-[70px] md:min-w-[90px]"><span className="text-primary font-black text-sm tracking-tighter">{Math.round(zoom * 100)}%</span><span className="hidden sm:inline text-[9px] font-black text-foreground/40 uppercase tracking-widest mt-0.5">Zoom</span></div>
                   <button onClick={() => setZoom(Math.min(5, zoom + 0.25))} className="w-10 md:w-12 h-10 md:h-12 flex items-center justify-center hover:bg-foreground/10 rounded-full text-xl md:text-2xl font-light text-foreground/70 transition-all leading-none pb-0.5 hover:text-primary">+</button>
                   <div className="w-px h-8 bg-border" />
                   <button onClick={handleResetView} className="px-5 md:px-8 py-2.5 md:py-3.5 bg-foreground/5 hover:bg-primary hover:text-primary-foreground rounded-full transition-all text-[10px] font-black uppercase tracking-[0.3em] shadow-lg text-foreground/80 font-bold border border-foreground/5">Reset</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style jsx global>{`
        body { overscroll-behavior: none; touch-action: none; overflow: hidden; background: hsl(var(--wb-background)); }
        canvas { touch-action: none; cursor: crosshair !important; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </main>
  );
}
