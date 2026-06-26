"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Archive,
  Menu,
  X,
  Edit3,
  Eye,
  FileDown,
  Layout,
  Search,
  Sidebar as SidebarIcon,
  Sun,
  Moon,
  HelpCircle,
  Code,
  CheckSquare,
  Heading,
  Table as TableIcon,
  MessageSquare,
  Copy,
  Zap,
  Sparkles,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { marked } from "marked";
import JSZip from "jszip";
import mermaid from "mermaid";

// Dynamically import html2pdf only on client
let html2pdf: any;
if (typeof window !== "undefined") {
  import("html2pdf.js").then((mod) => {
    html2pdf = mod.default;
  });
}

// --- Types ---
interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

// --- Custom Marked Renderer for Alerts ---
const renderer = new marked.Renderer();
const originalBlockquote = renderer.blockquote.bind(renderer);
renderer.blockquote = (token) => {
  const quoteContent = token.tokens.map((t: any) => t.raw).join('');
  const alertMatch = quoteContent.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n?([\s\S]*)/i);

  if (alertMatch) {
    const type = alertMatch[1].toUpperCase();
    const text = alertMatch[2];
    const colors: Record<string, string> = {
      NOTE: "border-blue-500 bg-blue-500/10 text-blue-400",
      TIP: "border-emerald-500 bg-emerald-500/10 text-emerald-400",
      IMPORTANT: "border-purple-500 bg-purple-500/10 text-purple-400",
      WARNING: "border-amber-500 bg-amber-500/10 text-amber-400",
      CAUTION: "border-red-500 bg-red-500/10 text-red-400",
    };

    return `<div class="border-l-4 p-4 my-4 ${colors[type] || colors.NOTE}">
      <div class="font-bold mb-1 text-xs uppercase tracking-widest">${type}</div>
      <div class="text-sm">${marked.parse(text)}</div>
    </div>`;
  }

  return originalBlockquote(token);
};

marked.setOptions({
  renderer,
  gfm: true,
  breaks: true,
});

// --- Constants ---
const NOTES_KEY = "notable_notes";
const ACTIVE_NOTE_ID_KEY = "notable_active_note_id";
const SIDEBAR_OPEN_KEY = "notable_sidebar_open";
const DARK_MODE_KEY = "notable_dark_mode";

// --- Utils ---
const generateId = () => Math.random().toString(36).substring(2, 9);

const saveNotes = (notes: Note[]) => {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
};

const loadNotes = (): Note[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(NOTES_KEY);
  return stored ? JSON.parse(stored) : [];
};

// --- Main Component ---
export default function NotableNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPreviewOnly, setIsPreviewOnly] = useState(false);
  const [isEditorOnly, setIsEditorOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showDocs, setShowDocs] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "formatting" | "diagrams" | "advanced">("basic");

  const activeNote = notes.find((n) => n.id === activeNoteId);
  const [localContent, setLocalContent] = useState("");
  const [localTitle, setLocalTitle] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const docSections = {
    basic: [
      {
        title: "Headings",
        code: "# Heading 1\n## Heading 2\n### Heading 3",
        desc: "Use '#' symbols to create headers. Increasing the number of '#' decreases the size.",
        preview: "# Heading 1\n## Heading 2\n### Heading 3"
      },
      {
        title: "Emphasis & Styles",
        code: "**Bold Text**\n*Italic Text*\n~~Strikethrough~~\n***Bold & Italic***",
        desc: "Wrap text with asterisks or tildes to apply various formatting styles.",
        preview: "**Bold Text**\n*Italic Text*\n~~Strikethrough~~\n***Bold & Italic***"
      },
      {
        title: "Links & Images",
        code: "[GitHub Profile](https://github.com/vikasyadavnsit)\n\n![Profile](https://api.dicebear.com/7.x/avataaars/svg?seed=Vikas)",
        desc: "Add descriptive links and embed images directly in your notes.",
        preview: "[GitHub Profile](https://github.com/vikasyadavnsit)\n\n![Profile](https://api.dicebear.com/7.x/avataaars/svg?seed=Vikas)"
      },
      {
        title: "Blockquotes",
        code: "> This is a standard blockquote.\n> It can contain multiple lines and *Markdown*.",
        desc: "Highlight specific passages or quotes from other sources.",
        preview: "> This is a standard blockquote.\n> It can contain multiple lines and *Markdown*."
      }
    ],
    formatting: [
      {
        title: "Data Tables",
        code: "| Language | Experience | Level |\n| :--- | :---: | ---: |\n| TypeScript | 3 Years | Expert |\n| Python | 4 Years | Pro |\n| Rust | 1 Year | Noob |",
        desc: "Organize data into rows and columns with custom text alignment (Left, Center, Right).",
        preview: "| Language | Experience | Level |\n| :--- | :---: | ---: |\n| TypeScript | 3 Years | Expert |\n| Python | 4 Years | Pro |\n| Rust | 1 Year | Noob |"
      },
      {
        title: "Interactive Task Lists",
        code: "- [x] Finish Portfolio UI\n- [x] Integrate Mermaid.js\n- [ ] Write documentation\n- [ ] Deploy to Vercel",
        desc: "Create interactive checklists to track your project progress directly in preview.",
        preview: "- [x] Finish Portfolio UI\n- [x] Integrate Mermaid.js\n- [ ] Write documentation\n- [ ] Deploy to Vercel"
      },
      {
        title: "Code Syntax Highlighting",
        code: "```javascript\nfunction welcome() {\n  console.log('Hello World');\n}\n```",
        desc: "Display code snippets with language-specific syntax highlighting and line formatting.",
        preview: "```javascript\nfunction welcome() {\n  console.log('Hello World');\n}\n```"
      },
      {
        title: "Ordered & Unordered Lists",
        code: "1. Learning\n2. Building\n   - Project A\n   - Project B\n3. Deploying",
        desc: "Create nested structures using numbers or bullet points for better organization.",
        preview: "1. Learning\n2. Building\n   - Project A\n   - Project B\n3. Deploying"
      }
    ],
    diagrams: [
      {
        title: "Logic Flowcharts",
        code: "```mermaid\ngraph LR\n  A[Entry] --> B{Valid?}\n  B -- Yes --> C(Success)\n  B -- No --> D(Error)\n```",
        desc: "Visualize complex logic flows and decision paths using Mermaid.js syntax.",
        preview: "```mermaid\ngraph LR\n  A[Entry] --> B{Valid?}\n  B -- Yes --> C(Success)\n  B -- No --> D(Error)\n```"
      },
      {
        title: "Sequence Interaction",
        code: "```mermaid\nsequenceDiagram\n  User->>App: Click Button\n  App->>DB: Fetch Data\n  DB-->>App: JSON Result\n  App-->>User: Update UI\n```",
        desc: "Model how different parts of your system interact over time.",
        preview: "```mermaid\nsequenceDiagram\n  User->>App: Click Button\n  App->>DB: Fetch Data\n  DB-->>App: JSON Result\n  App-->>User: Update UI\n```"
      },
      {
        title: "Project Gantt Charts",
        code: "```mermaid\ngantt\n  title Roadmap 2024\n  section Dev\n  Backend :a1, 2024-01-01, 30d\n  Frontend :after a1, 20d\n```",
        desc: "Plan and track project schedules with visual timelines.",
        preview: "```mermaid\ngantt\n  title Roadmap 2024\n  section Dev\n  Backend :a1, 2024-01-01, 30d\n  Frontend :after a1, 20d\n```"
      },
      {
        title: "Class Structures",
        code: "```mermaid\nclassDiagram\n  User <|-- Admin\n  User : +String name\n  User : +login()\n```",
        desc: "Visualize object-oriented architectures and relationships.",
        preview: "```mermaid\nclassDiagram\n  User <|-- Admin\n  User : +String name\n  User : +login()\n```"
      }
    ],
    advanced: [
      {
        title: "GitHub-style Callouts",
        code: "> [!NOTE]\n> Standard information box.\n\n> [!WARNING]\n> Critical alert style.",
        desc: "Use special blockquotes to create colorful, icon-rich callouts (NOTE, TIP, IMPORTANT, WARNING, CAUTION).",
        preview: "> [!NOTE]\n> Standard information box.\n\n> [!WARNING]\n> Critical alert style."
      },
      {
        title: "Collapsible Details",
        code: "<details>\n<summary><b>Click for technical specs</b></summary>\n- CPU: 8 Cores\n- RAM: 32GB\n</details>",
        desc: "Hide complex details or spoilers behind a clickable summary toggle.",
        preview: "<details>\n<summary><b>Click for technical specs</b></summary>\n- CPU: 8 Cores\n- RAM: 32GB\n</details>"
      },
      {
        title: "Rich Typography",
        code: "Press <kbd>Ctrl</kbd> + <kbd>V</kbd>\n\nH<sub>2</sub>O and E = mc<sup>2</sup>",
        desc: "Use HTML tags for keyboard shortcuts, subscripts, and superscripts.",
        preview: "Press <kbd>Ctrl</kbd> + <kbd>V</kbd>\n\nH<sub>2</sub>O and E = mc<sup>2</sup>"
      },
      {
        title: "Horizontal Dividers",
        code: "Top Section\n\n---\n\nBottom Section",
        desc: "Visually separate large chunks of content with a subtle horizontal rule.",
        preview: "Top Section\n\n---\n\nBottom Section"
      }
    ]
  };

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: isDarkMode ? 'dark' : 'default',
      securityLevel: 'loose',
    });
  }, [isDarkMode]);

  // Re-run Mermaid when content changes
  useEffect(() => {
    const timer = setTimeout(() => {
      mermaid.contentLoaded();
    }, 300);
    return () => clearTimeout(timer);
  }, [localContent, activeTab, showDocs, isEditorOnly]);

  // Initialize state from localStorage
  useEffect(() => {
    const loadedNotes = loadNotes();
    const savedActiveId = localStorage.getItem(ACTIVE_NOTE_ID_KEY);
    const savedSidebarState = localStorage.getItem(SIDEBAR_OPEN_KEY);
    const savedDarkMode = localStorage.getItem(DARK_MODE_KEY);

    if (loadedNotes.length === 0) {
      const initialNote: Note = {
        id: generateId(),
        title: "🚀 Mastering Markdown: The Ultimate Guide",
        content: `# 🚀 Mastering Markdown: The Ultimate Guide

Welcome to **Notable Notes**! This guide is a live demonstration of everything you can do in this editor.

> [!TIP]
> This note is saved locally. Feel free to edit it to see the real-time preview in action!

---

## 📑 Table of Contents
1. [Basic Syntax](#-basic-syntax)
2. [Lists & Tasks](#-lists--task-lists)
3. [Tables](#-tables)
4. [Code & Syntax Highlighting](#-code--syntax-highlighting)
5. [Alerts & Callouts](#-alerts--callouts)
6. [Diagrams (Mermaid)](#-diagrams-mermaid)
7. [Advanced HTML Components](#-advanced-html-components)

---

## ✍️ Basic Syntax

You can make text **bold**, *italic*, or ~~strikethrough~~. You can even ***combine them***.

### Headings
# Heading 1
## Heading 2
### Heading 3
#### Heading 4

### Links & Images
[Visit my GitHub](https://github.com/vikasyadavnsit)

![Markdown Logo](https://markdown-here.com/img/icon256.png)

---

## 📋 Lists & Task Lists

### Unordered List
- Item 1
  - Sub-item A
  - Sub-item B
- Item 2

### Ordered List
1. First thing
2. Second thing
   1. Sub-step

### Task List
- [x] Create a high-performance portfolio
- [x] Implement rich Markdown support
- [ ] Dominate the web engineering space

---

## 📊 Tables

| Feature | Support | Performance |
| :--- | :---: | ---: |
| **Real-time Preview** | ✅ Yes | 🚀 High |
| **Local Storage** | ✅ Yes | ⚡ Instant |
| **Mermaid Diagrams** | ✅ Yes | 🎨 Dynamic |
| **PDF Export** | ✅ Yes | 📄 Ready |

---

## 💻 Code & Syntax Highlighting

### Inline Code
Use \`backticks\` for inline code like \`const x = 10;\`.

### Code Blocks
\`\`\`javascript
// A simple function to greet the world
function greet(name = "User") {
  console.log(\`Hello, \${name}! Welcome to Notable Notes.\`);
}

greet("Vikas");
\`\`\`

\`\`\`python
def calculate_pi(n_terms):
    pi = 0
    for i in range(n_terms):
        pi += 4 * ((-1)**i) / (2*i + 1)
    return pi

print(f"Approximated Pi: {calculate_pi(1000000)}")
\`\`\`

---

## 💡 Alerts & Callouts

> [!NOTE]
> This is a standard note for general information.

> [!TIP]
> This is a helpful tip to improve your workflow.

> [!IMPORTANT]
> This is critical information you shouldn't miss.

> [!WARNING]
> This is a warning to be careful with certain actions.

> [!CAUTION]
> This is a high-risk warning for dangerous operations.

---

## 🎨 Diagrams (Mermaid)

### Flowchart
\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Celebrate!]
    B -- No --> D[Debug with AI]
    D --> B
\`\`\`

### Sequence Diagram
\`\`\`mermaid
sequenceDiagram
    participant User
    participant Editor
    participant LocalStorage
    User->>Editor: Type Markdown
    Editor->>Editor: Render Preview
    Editor->>LocalStorage: Auto-save content
    LocalStorage-->>Editor: Confirm Save
    Editor-->>User: Visual Feedback
\`\`\`

### Gantt Chart
\`\`\`mermaid
gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Design
    UI Mockups           :a1, 2024-01-01, 30d
    section Development
    Core Engine          :after a1  , 20d
    Markdown Parser      : 12d
    section Testing
    Alpha Release        : 2024-03-01, 15d
\`\`\`

---

## 🛠️ Advanced HTML Components

<details>
<summary><b>Click to see hidden engineering secrets</b></summary>

### 🔍 Deep Dive
This editor uses **Marked.js** for core parsing and a custom renderer for GitHub-style alerts. **Mermaid.js** is used for the diagrams, and **Framer Motion** handles the smooth UI transitions.

- Zero server dependency
- 100% Client-side execution
- Optimized for speed
</details>

### Keyboard Shortcuts
Press <kbd>Ctrl</kbd> + <kbd>S</kbd> to save manually (though we auto-save!).
Use <kbd>Tab</kbd> to indent your code.

### Math & Typography
H<sub>2</sub>O is water.
E = mc<sup>2</sup>

> "The best way to predict the future is to create it."
> — *Peter Drucker*`,
        updatedAt: Date.now()
      };
      setNotes([initialNote]);
      setActiveNoteId(initialNote.id);
      saveNotes([initialNote]);
    } else {
      setNotes(loadedNotes);
      if (savedActiveId && loadedNotes.some(n => n.id === savedActiveId)) {
        setActiveNoteId(savedActiveId);
      } else {
        setActiveNoteId(loadedNotes[0].id);
      }
    }

    if (savedSidebarState !== null) {
      setIsSidebarOpen(savedSidebarState === "true");
    }
    if (savedDarkMode !== null) {
      setIsDarkMode(savedDarkMode === "true");
    }
  }, []);

  // Save active note ID to localStorage when it changes
  useEffect(() => {
    if (activeNoteId) {
      localStorage.setItem(ACTIVE_NOTE_ID_KEY, activeNoteId);
    }
  }, [activeNoteId]);

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem(SIDEBAR_OPEN_KEY, String(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    localStorage.setItem(DARK_MODE_KEY, String(isDarkMode));
  }, [isDarkMode]);

  // Update local state when active note changes
  useEffect(() => {
    if (activeNote) {
      setLocalContent(activeNote.content);
      setLocalTitle(activeNote.title);
    } else {
      setLocalContent("");
      setLocalTitle("");
    }
  }, [activeNoteId]);

  // Handle note content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);

    if (activeNoteId) {
      const updatedNotes = notes.map((n) =>
        n.id === activeNoteId ? { ...n, content: newContent, updatedAt: Date.now() } : n
      );
      setNotes(updatedNotes);
      saveNotes(updatedNotes);
    }
  };

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);

    if (activeNoteId) {
      const updatedNotes = notes.map((n) =>
        n.id === activeNoteId ? { ...n, title: newTitle, updatedAt: Date.now() } : n
      );
      setNotes(updatedNotes);
      saveNotes(updatedNotes);
    }
  };

  // Create new note
  const createNewNote = () => {
    const newNote: Note = {
      id: generateId(),
      title: "New Note",
      content: "",
      updatedAt: Date.now()
    };
    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    setActiveNoteId(newNote.id);
    saveNotes(updatedNotes);
  };

  // Delete note
  const deleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedNotes = notes.filter((n) => n.id !== id);
    setNotes(updatedNotes);
    saveNotes(updatedNotes);

    if (activeNoteId === id) {
      setActiveNoteId(updatedNotes.length > 0 ? updatedNotes[0].id : null);
    }
  };

  // Export as PDF
  const exportAsPDF = async () => {
    if (!activeNote || !previewRef.current || !html2pdf) return;

    const opt = {
      margin: 10,
      filename: `${activeNote.title || 'note'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // We clone the preview and ensure it has white background for PDF
    const clone = previewRef.current.cloneNode(true) as HTMLDivElement;
    clone.style.background = "white";
    clone.style.color = "black";
    clone.style.width = "190mm"; // Slightly smaller than A4 to account for margins
    clone.style.padding = "10mm";

    // Remove "dark" classes from clone
    clone.classList.remove("prose-invert");
    clone.querySelectorAll("*").forEach(el => {
      (el as HTMLElement).style.color = "black";
    });

    html2pdf().from(clone).set(opt).save();
  };

  // Export all as ZIP
  const exportAllAsZIP = async () => {
    const zip = new JSZip();
    notes.forEach((note) => {
      zip.file(`${note.title || 'untitled'}.md`, note.content);
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = "all_notes.zip";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter notes by search
  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className={`flex h-screen overflow-hidden ${isDarkMode ? "bg-[#0a0a0a] text-white" : "bg-white text-gray-900"}`}>
      <style jsx global>{`
        .prose kbd {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          box-shadow: 0 1px 1px rgba(0,0,0,0.2);
          color: #374151;
          display: inline-block;
          font-size: 0.85em;
          font-weight: 600;
          line-height: 1;
          padding: 2px 4px;
          white-space: nowrap;
        }
        .dark .prose kbd {
          background-color: #374151;
          border-color: #4b5563;
          color: #e5e7eb;
        }
        .prose details {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          margin-bottom: 1rem;
        }
        .dark .prose details {
          border-color: #374151;
        }
        .prose summary {
          font-weight: 600;
          cursor: pointer;
          outline: none;
        }
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        .prose th, .prose td {
          border: 1px solid #e5e7eb;
          padding: 8px 12px;
          text-align: left;
        }
        .dark .prose th, .dark .prose td {
          border-color: #374151;
        }
        .prose input[type="checkbox"] {
          margin-right: 8px;
        }
        .prose pre {
          background-color: #f3f4f6;
          border-radius: 8px;
          padding: 1rem;
          overflow-x: auto;
        }
        .dark .prose pre {
          background-color: #1a1a1a;
        }
        .prose blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin-left: 0;
          color: #6b7280;
        }
        .dark .prose blockquote {
          border-left-color: #374151;
          color: #9ca3af;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className={`border-r shrink-0 flex flex-col ${isDarkMode ? "border-gray-800 bg-[#0f0f0f]" : "border-gray-200 bg-gray-50"}`}
          >
            {/* Sidebar Header */}
            <div className="p-4 flex items-center justify-between border-b border-inherit">
              <Link href="/projects/creative-stuff" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="font-bold text-lg">Notable</h1>
              <button
                onClick={createNewNote}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isDarkMode ? "bg-black/20 border-gray-700" : "bg-white border-gray-300"}`}>
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none text-sm w-full"
                />
              </div>
            </div>

            {/* Note List */}
            <div className="flex-1 overflow-y-auto">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className={`group px-4 py-3 cursor-pointer transition-colors border-b border-inherit relative ${
                    activeNoteId === note.id
                      ? (isDarkMode ? "bg-blue-900/20 border-l-4 border-l-blue-600" : "bg-blue-50 border-l-4 border-l-blue-600")
                      : (isDarkMode ? "hover:bg-white/5" : "hover:bg-black/5")
                  }`}
                >
                  <h3 className="font-medium truncate pr-6">{note.title || "Untitled"}</h3>
                  <p className={`text-xs mt-1 truncate ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    {note.content.substring(0, 50) || "No content"}
                  </p>
                  <button
                    onClick={(e) => deleteNote(note.id, e)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-inherit flex items-center justify-between">
              <button
                onClick={exportAllAsZIP}
                className="flex items-center gap-2 text-xs font-medium hover:text-blue-500 transition-colors"
              >
                <Archive className="w-4 h-4" /> Export all ZIP
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Toolbar */}
        <div className={`flex items-center justify-between px-6 py-3 border-b ${isDarkMode ? "border-gray-800 bg-[#0a0a0a]" : "border-gray-200 bg-white"}`}>
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <SidebarIcon className="w-5 h-5" />
            </button>

            {activeNoteId && (
              <input
                type="text"
                value={localTitle}
                onChange={handleTitleChange}
                placeholder="Note Title"
                className="bg-transparent font-bold text-lg outline-none border-b border-transparent focus:border-blue-600 transition-colors flex-1"
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDocs(true)}
              title="Markdown Help"
              className="p-2 hover:bg-blue-600/10 rounded-lg transition-colors flex items-center gap-2 text-sm text-blue-500"
            >
              <Sparkles className="w-5 h-5 animate-pulse" /> <span className="hidden lg:inline font-bold">Docs</span>
            </button>
            <div className="w-px h-6 bg-inherit mx-2" />
            {activeNoteId && (
              <>
                <button
                  onClick={exportAsPDF}
                  title="Export as PDF"
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 text-sm"
                >
                  <FileDown className="w-5 h-5" /> <span className="hidden md:inline">PDF</span>
                </button>
                <div className="w-px h-6 bg-inherit mx-2" />
                <button
                  onClick={() => { setIsEditorOnly(false); setIsPreviewOnly(false); }}
                  className={`p-2 rounded-lg transition-colors ${!isEditorOnly && !isPreviewOnly ? "bg-blue-600 text-white" : "hover:bg-white/10"}`}
                >
                  <Layout className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setIsEditorOnly(true); setIsPreviewOnly(false); }}
                  className={`p-2 rounded-lg transition-colors ${isEditorOnly ? "bg-blue-600 text-white" : "hover:bg-white/10"}`}
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setIsEditorOnly(false); setIsPreviewOnly(true); }}
                  className={`p-2 rounded-lg transition-colors ${isPreviewOnly ? "bg-blue-600 text-white" : "hover:bg-white/10"}`}
                >
                  <Eye className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Editor & Preview Split Pane */}
        <div className="flex-1 flex overflow-hidden relative">
          {activeNoteId ? (
            <>
              {/* Editor */}
              <div
                className={`h-full transition-all duration-300 ${
                  isPreviewOnly ? "w-0 opacity-0 overflow-hidden" : (isEditorOnly ? "w-full" : "w-1/2")
                }`}
              >
                <textarea
                  value={localContent}
                  onChange={handleContentChange}
                  placeholder="Start writing in Markdown..."
                  className={`w-full h-full p-8 resize-none outline-none font-mono text-base leading-relaxed bg-transparent ${
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                />
              </div>

              {/* Divider */}
              {!isEditorOnly && !isPreviewOnly && (
                <div className={`w-px h-full ${isDarkMode ? "bg-gray-800" : "bg-gray-200"}`} />
              )}

              {/* Preview */}
              <div
                className={`h-full overflow-y-auto transition-all duration-300 ${
                  isEditorOnly ? "w-0 opacity-0 overflow-hidden" : (isPreviewOnly ? "w-full" : "w-1/2")
                }`}
              >
                <div
                  ref={previewRef}
                  className={`p-8 prose prose-slate max-w-none ${isDarkMode ? "prose-invert" : ""}`}
                  dangerouslySetInnerHTML={{ __html: marked.parse(localContent) as string }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Select a note or create a new one to start writing.</p>
                <button
                  onClick={createNewNote}
                  className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all"
                >
                  Create New Note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documentation Modal */}
      <AnimatePresence>
        {showDocs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDocs(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-6xl h-[90vh] overflow-hidden rounded-3xl border shadow-2xl flex flex-col ${
                isDarkMode ? "bg-[#0d0d0d] border-gray-800" : "bg-white border-gray-200"
              }`}
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-inherit flex items-center justify-between shrink-0 bg-gradient-to-r from-blue-600/10 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Mastering Markdown</h2>
                    <p className="text-sm text-gray-500 font-medium">Visual guide with side-by-side previews</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDocs(false)}
                  className="p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all hover:rotate-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="px-8 py-4 border-b border-inherit flex gap-3 shrink-0 overflow-x-auto no-scrollbar bg-inherit/50 backdrop-blur-md sticky top-0 z-10">
                {(["basic", "formatting", "diagrams", "advanced"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all capitalize whitespace-nowrap flex items-center gap-2 ${
                      activeTab === tab
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                        : "hover:bg-blue-500/10 text-gray-500 hover:text-blue-500"
                    }`}
                  >
                    {activeTab === tab && <ChevronRight className="w-4 h-4" />}
                    {tab}
                  </button>
                ))}
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-12 no-scrollbar">
                <div className="grid grid-cols-1 gap-8">
                  {docSections[activeTab].map((section, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`group rounded-3xl border overflow-hidden transition-all hover:border-blue-500/30 ${
                        isDarkMode ? "bg-black/40 border-gray-800" : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      {/* Section Header */}
                      <div className="px-6 py-4 border-b border-inherit flex items-center justify-between bg-inherit/50">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                          <h3 className="font-bold text-lg">{section.title}</h3>
                        </div>
                        <button
                          onClick={() => copyToClipboard(section.code)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-xl transition-all text-xs font-bold"
                        >
                          <Copy className="w-4 h-4" /> Copy Code
                        </button>
                      </div>

                      {/* Content Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2">
                        {/* Editor Side */}
                        <div className="p-6 flex flex-col h-full border-b lg:border-b-0 border-inherit">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                            <Code className="w-3 h-3" /> Input (Markdown)
                          </span>
                          <div className={`flex-1 p-5 rounded-2xl font-mono text-sm leading-relaxed overflow-auto min-h-[120px] ${
                            isDarkMode ? "bg-black/60 text-blue-400" : "bg-white text-blue-600 border border-gray-100"
                          }`}>
                            <pre className="whitespace-pre-wrap break-words">
                              {section.code}
                            </pre>
                          </div>
                          <p className="mt-4 text-sm text-gray-500 leading-relaxed font-medium italic">
                            {section.desc}
                          </p>
                        </div>

                        {/* Preview Side */}
                        <div className={`p-6 flex flex-col h-full border-l-0 lg:border-l border-inherit ${isDarkMode ? "bg-white/[0.02]" : "bg-white"}`}>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                            <Eye className="w-3 h-3" /> Output (Preview)
                          </span>
                          <div className={`flex-1 min-h-[120px] prose prose-sm max-w-none ${isDarkMode ? "prose-invert" : ""}`}
                            dangerouslySetInnerHTML={{ __html: marked.parse(section.preview) as string }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-inherit shrink-0 flex items-center justify-between bg-inherit/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Ready to create something amazing?</p>
                </div>
                <button
                  onClick={() => setShowDocs(false)}
                  className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all font-bold text-sm shadow-xl shadow-blue-500/20 active:scale-95"
                >
                  Got it, Let's Write!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
