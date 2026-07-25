"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Language } from '../lib/problems';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Type } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  language: Language;
}

const KEYWORDS = {
  global: ['if', 'else', 'for', 'while', 'return', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'null', 'true', 'false'],
  javascript: ['const', 'let', 'var', 'function', 'await', 'async', 'import', 'export', 'class', 'this', 'console.log'],
  java: ['public', 'private', 'protected', 'static', 'void', 'int', 'double', 'float', 'long', 'boolean', 'char', 'String', 'class', 'interface', 'extends', 'implements', 'super', 'this', 'System.out.println', 'ArrayList', 'HashMap', 'HashSet', 'Stack', 'PriorityQueue']
};

export function Editor({ value, onChange, language }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [lineCount, setLineCount] = useState(1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setLineCount(value.split('\n').length);
  }, [value]);

  const highlight = (code: string) => {
    // 1. Escaping HTML first
    let escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // 2. Single pass regex to find all tokens without overlap or re-processing HTML tags
    // Group 1: Comments, Group 2: Strings, Group 3: Keywords, Group 4: Special/Booleans, Group 5: Numbers
    const combinedRegex = /(\/\/.*$|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b(?:function|return|class|if|else|for|while|new|public|private|protected|static|void|int|double|String|let|const|var|async|await|interface)\b)|(\b(?:true|false|null|this|super)\b)|(\b\d+\b)/gm;

    return escaped.replace(combinedRegex, (match, g1, g2, g3, g4, g5) => {
      if (g1) return `<span class="text-zinc-600 italic">${match}</span>`;
      if (g2) return `<span class="text-emerald-400">${match}</span>`;
      if (g3) return `<span class="text-pink-500 font-bold">${match}</span>`;
      if (g4) return `<span class="text-violet-400">${match}</span>`;
      if (g5) return `<span class="text-amber-400">${match}</span>`;
      return match;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(suggestions[suggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setSuggestions([]);
        return;
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = value.substring(0, start) + "    " + value.substring(end);
      onChange(newValue);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
  };

  const applySuggestion = (word: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const textBefore = value.substring(0, start);
    const match = textBefore.match(/\b\w+$/);
    if (!match) return;

    const wordStart = match.index!;
    const newValue = value.substring(0, wordStart) + word + value.substring(start);
    onChange(newValue);
    setSuggestions([]);

    setTimeout(() => {
      el.selectionStart = el.selectionEnd = wordStart + word.length;
      el.focus();
    }, 0);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    const pos = e.target.selectionStart;
    const textBefore = val.substring(0, pos);
    const lastWordMatch = textBefore.match(/\b\w+$/);

    if (lastWordMatch) {
      const lastWord = lastWordMatch[0].toLowerCase();
      if (lastWord.length >= 1) {
        const list = [...KEYWORDS.global, ...(language === 'java' ? KEYWORDS.java : KEYWORDS.javascript)];
        const matches = Array.from(new Set(list))
          .filter(w => w.toLowerCase().startsWith(lastWord) && w !== lastWord)
          .slice(0, 8);

        setSuggestions(matches);
        setSuggestionIndex(0);

        // Position suggestion box (simplified)
        const rect = e.target.getBoundingClientRect();
        const lineIdx = textBefore.split('\n').length - 1;
        const charIdx = textBefore.split('\n').pop()?.length || 0;
        setSuggestionPos({
          top: lineIdx * 20 + 24, // 20px line height + padding
          left: charIdx * 8.5 + 48 // 8.5px char width + line number width
        });
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const syncScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  return (
    <div className="flex-1 flex bg-zinc-950 font-mono text-sm overflow-hidden relative border-t border-zinc-800">
      {/* Line Numbers */}
      <div className="flex-shrink-0 w-12 bg-zinc-900/50 text-zinc-600 text-right pr-3 py-4 select-none border-r border-zinc-800 z-10">
        {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
          <div key={i} className="h-5 leading-5">{i + 1}</div>
        ))}
      </div>

      {/* Editor Container */}
      <div className="flex-1 relative overflow-hidden">
        {/* Syntax Highlighted Layer */}
        <pre
          ref={preRef}
          className="absolute inset-0 p-4 m-0 pointer-events-none whitespace-pre overflow-hidden leading-5 text-zinc-300"
          dangerouslySetInnerHTML={{ __html: highlight(value) + "\n" }}
        />

        {/* Input Layer */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          className="absolute inset-0 bg-transparent text-transparent caret-indigo-400 p-4 outline-none resize-none h-full w-full leading-5 whitespace-pre overflow-auto z-0"
          spellCheck={false}
          placeholder="// Write your solution here..."
        />

        {/* Suggestion Dropdown */}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 overflow-hidden min-w-[140px]"
              style={{ top: suggestionPos.top, left: Math.min(suggestionPos.left, 400) }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  onClick={() => applySuggestion(s)}
                  onMouseEnter={() => setSuggestionIndex(i)}
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-[11px] flex items-center gap-2 transition-colors",
                    suggestionIndex === i ? "bg-indigo-600 text-white" : "text-zinc-400 hover:bg-zinc-800"
                  )}
                >
                  <Type className="w-3 h-3 opacity-50" />
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Info */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
          <Wand2 className="w-3 h-3" />
          IntelliSense Active
        </div>
      </div>
    </div>
  );
}
