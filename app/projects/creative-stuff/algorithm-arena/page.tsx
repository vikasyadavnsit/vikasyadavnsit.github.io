"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2, Play, ChevronRight, Terminal, Trophy, BookOpen,
  RotateCcw, Share2, CheckCircle2, XCircle, Info, ArrowLeft,
  Settings, ChevronDown, Monitor, Plus, Save, Trash2, Edit3, Wand2
} from "lucide-react";
import Link from "next/link";
import { problems as defaultProblems, Problem, Language, TestCase } from "./lib/problems";
import { ResizablePane } from "./components/ResizablePane";
import { Editor } from "./components/Editor";
import { runCode, ExecutionResult } from "./lib/engine/runner";
import { generateBoilerplate } from "./lib/boilerplate";
import { prettify } from "./lib/formatter";
import { cn } from "@/lib/utils";

export default function AlgorithmArena() {
  const [allProblems, setAllProblems] = useState<Problem[]>(defaultProblems);
  const [selectedProblem, setSelectedProblem] = useState<Problem>(defaultProblems[0]);
  const [language, setLanguage] = useState<Language>("javascript");
  const [code, setCode] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "results">("description");
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [view, setView] = useState<"arena" | "creator">("arena");

  // Creator state
  const [newProb, setNewProb] = useState<Partial<Problem>>({
    title: "",
    description: "",
    difficulty: "Easy",
    category: "Custom",
    methodName: "solve",
    parameters: ["nums"],
    testCases: [{ input: [[1, 2, 3]], expected: 6 }]
  });

  const [isEditingCustom, setIsEditingCustom] = useState(false);

  // 1. Initial hydration of custom problems, selected problem, and language
  useEffect(() => {
    const savedCustom = localStorage.getItem("aa_custom_problems");
    let currentProblems = defaultProblems;
    if (savedCustom) {
      try {
        const customProbs = JSON.parse(savedCustom);
        currentProblems = [...defaultProblems, ...customProbs];
        setAllProblems(currentProblems);
      } catch (e) {
        console.error("Failed to load custom problems", e);
      }
    }

    const savedProbId = localStorage.getItem("aa_last_problem_id");
    if (savedProbId) {
      const prob = currentProblems.find(p => p.id === savedProbId);
      if (prob) setSelectedProblem(prob);
    }

    const savedLang = localStorage.getItem("aa_last_language");
    if (savedLang === "javascript" || savedLang === "java") {
      setLanguage(savedLang);
    }
  }, []);

  // 2. Persist global preferences
  useEffect(() => {
    localStorage.setItem("aa_last_problem_id", selectedProblem.id);
  }, [selectedProblem.id]);

  useEffect(() => {
    localStorage.setItem("aa_last_language", language);
  }, [language]);

  // Save custom problems
  const saveCustomProblem = () => {
    if (!newProb.title || !newProb.methodName) return;

    const id = newProb.title.toLowerCase().replace(/\s+/g, '-');
    const languages: Language[] = ['javascript', 'java'];
    const starterCode: any = {};

    languages.forEach(lang => {
      starterCode[lang] = generateBoilerplate(
        newProb.methodName!,
        newProb.parameters!,
        lang
      );
    });

    const prob: Problem = {
      ...newProb as Problem,
      id: isEditingCustom ? (newProb.id || id) : id,
      starterCode,
      isCustom: true
    };

    const existingCustom = allProblems.filter(p => p.isCustom);
    const updatedCustom = [...existingCustom.filter(p => p.id !== prob.id), prob];

    localStorage.setItem("aa_custom_problems", JSON.stringify(updatedCustom));
    setAllProblems([...defaultProblems, ...updatedCustom]);
    setSelectedProblem(prob);
    setIsEditingCustom(false);
    setView("arena");
  };

  const handleEditProblem = (prob: Problem) => {
    setNewProb({ ...prob });
    setIsEditingCustom(true);
    setView("creator");
  };

  const deleteCustomProblem = (id: string) => {
    const updatedCustom = allProblems.filter(p => p.isCustom && p.id !== id);
    localStorage.setItem("aa_custom_problems", JSON.stringify(updatedCustom));
    setAllProblems([...defaultProblems, ...updatedCustom]);
    if (selectedProblem.id === id) setSelectedProblem(defaultProblems[0]);
  };

  // Persistence for code
  useEffect(() => {
    const saved = localStorage.getItem(`aa_code_${selectedProblem.id}_${language}`);
    if (saved) setCode(saved);
    else setCode(selectedProblem.starterCode[language]);
    setResult(null);
  }, [selectedProblem, language]);

  useEffect(() => {
    if (code) {
      localStorage.setItem(`aa_code_${selectedProblem.id}_${language}`, code);
    }
  }, [code, selectedProblem, language]);

  const handleRun = async () => {
    setIsExecuting(true);
    setActiveTab("results");
    try {
      const res = await runCode(code, language, selectedProblem);
      setResult(res);
    } catch (e: any) {
      setResult({
        success: false,
        results: [{ passed: false, input: [], expected: null, actual: null, error: e.message }],
        console: [],
        totalPassed: 0,
        totalTests: selectedProblem.testCases.length
      });
    }
    setIsExecuting(false);
  };

  const handleReset = () => {
    if (confirm("Reset code to starter boilerplate?")) {
      setCode(selectedProblem.starterCode[language]);
    }
  };

  const handlePrettify = () => {
    setCode(prettify(code));
  };

  return (
    <main className="h-screen bg-[#0a0a0a] text-zinc-300 flex flex-col overflow-hidden">
      {/* Navbar */}
      <nav className="h-14 border-b border-zinc-800 bg-zinc-950/50 flex items-center px-4 shrink-0 gap-4">
        <Link href="/projects/creative-stuff" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <Code2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-white leading-tight">Algorithm Arena</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Project sandbox</p>
          </div>
        </div>

        <div className="h-4 w-px bg-zinc-800 mx-2" />

        {view === "arena" ? (
          <>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-zinc-500 hidden md:block">Problem:</span>
              <select
                value={selectedProblem.id}
                onChange={(e) => setSelectedProblem(allProblems.find(p => p.id === e.target.value) || allProblems[0])}
                className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 outline-none text-white focus:border-indigo-500/50 transition-colors text-xs"
              >
                {allProblems.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setNewProb({
                  title: "",
                  description: "",
                  difficulty: "Easy",
                  category: "Custom",
                  methodName: "solve",
                  parameters: ["nums"],
                  testCases: [{ input: [[1, 2, 3]], expected: 6 }]
                });
                setIsEditingCustom(false);
                setView("creator");
              }}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-indigo-400"
              title="Create Custom Problem"
            >
              <Plus className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("arena")}
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Arena
            </button>
          </div>
        )}

        <div className="flex-1" />

        {view === "arena" && (
          <>
            <div className="relative">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-white"
              >
                {language} <ChevronDown className={cn("w-3 h-3 transition-transform", showLanguageMenu && "rotate-180")} />
              </button>
              <AnimatePresence>
                {showLanguageMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-2 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden"
                  >
                    {(['javascript', 'java'] as Language[]).map(lang => (
                      <button
                        key={lang}
                        onClick={() => { setLanguage(lang); setShowLanguageMenu(false); }}
                        className={cn(
                          "w-full px-4 py-2 text-left text-xs font-medium hover:bg-zinc-800 transition-colors uppercase tracking-wide",
                          language === lang ? "text-indigo-400 bg-indigo-500/5" : "text-zinc-400"
                        )}
                      >
                        {lang}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={handleRun}
              disabled={isExecuting}
              className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] sm:text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
            >
              {isExecuting ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span className="hidden sm:inline">Run Code</span>
              <span className="sm:hidden">Run</span>
            </button>
          </>
        )}
      </nav>

      <div className="flex-1 overflow-hidden">
        {view === "arena" ? (
          <ResizablePane
            direction="horizontal"
            initialRatio={35}
            left={
              <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800">
                <div className="flex items-center gap-1 p-2 border-b border-zinc-800 bg-zinc-900/30 overflow-x-auto no-scrollbar">
                  <TabButton active={activeTab === 'description'} onClick={() => setActiveTab('description')} icon={BookOpen}>Description</TabButton>
                  <TabButton active={activeTab === 'results'} onClick={() => setActiveTab('results')} icon={Trophy}>Results</TabButton>
                </div>

                <div className="flex-1 overflow-auto p-4 sm:p-6">
                  {activeTab === 'description' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl sm:text-2xl font-bold text-white">{selectedProblem.title}</h2>
                            <span className={cn(
                              "text-[8px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border",
                              selectedProblem.difficulty === 'Easy' ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" :
                              selectedProblem.difficulty === 'Medium' ? "text-amber-400 border-amber-500/20 bg-amber-500/5" :
                              "text-rose-400 border-rose-500/20 bg-rose-500/5"
                            )}>
                              {selectedProblem.difficulty}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {selectedProblem.isCustom && (
                              <>
                                <button
                                  onClick={() => handleEditProblem(selectedProblem)}
                                  className="p-1.5 hover:bg-indigo-500/10 rounded-md text-zinc-600 hover:text-indigo-400 transition-colors"
                                  title="Edit Problem"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteCustomProblem(selectedProblem.id)}
                                  className="p-1.5 hover:bg-rose-500/10 rounded-md text-zinc-600 hover:text-rose-400 transition-colors"
                                  title="Delete Problem"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                      </div>
                      <div className="prose prose-invert prose-sm max-w-none">
                        <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap">{selectedProblem.description}</p>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'results' && (
                    <div className="space-y-4">
                      {!result && !isExecuting && (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                          <Monitor className="w-12 h-12 mb-4 opacity-20" />
                          <p className="text-sm">Run your code to see the results here</p>
                        </div>
                      )}

                      {isExecuting && (
                        <div className="flex items-center gap-3 py-10 justify-center text-indigo-400">
                          <RotateCcw className="w-5 h-5 animate-spin" />
                          <span className="text-sm font-medium">Evaluating your solution...</span>
                        </div>
                      )}

                      {result && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                          <div className={cn(
                            "p-4 rounded-xl border flex items-center justify-between",
                            result.success ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
                          )}>
                            <div className="flex items-center gap-3">
                              {result.success ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <XCircle className="w-6 h-6 text-rose-500" />}
                              <div>
                                <p className="text-lg font-bold text-white">{result.success ? "Accepted" : "Wrong Answer"}</p>
                                <p className="text-xs text-zinc-500">{result.totalPassed} / {result.totalTests} test cases passed in {result.time?.toFixed(2)}ms</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Test Cases</p>
                            {result.results.map((r, i) => (
                              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-zinc-400">Case {i + 1}</span>
                                  {r.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-[11px]">
                                  <div>
                                    <p className="text-zinc-600 mb-1 uppercase font-bold tracking-tighter">Input</p>
                                    <pre className="bg-zinc-950 p-1.5 rounded border border-zinc-800 text-zinc-400 overflow-x-auto">{JSON.stringify(r.input)}</pre>
                                  </div>
                                  <div>
                                    <p className="text-zinc-600 mb-1 uppercase font-bold tracking-tighter">Output</p>
                                    <pre className={cn(
                                      "p-1.5 rounded border border-zinc-800 overflow-x-auto",
                                      r.passed ? "text-emerald-400" : "text-rose-400"
                                    )}>{JSON.stringify(r.actual)}</pre>
                                  </div>
                                </div>
                                {!r.passed && !r.error && (
                                  <div className="mt-2">
                                    <p className="text-zinc-600 mb-1 uppercase font-bold tracking-tighter">Expected</p>
                                    <pre className="bg-zinc-950 p-1.5 rounded border border-zinc-800 text-emerald-400 overflow-x-auto">{JSON.stringify(r.expected)}</pre>
                                  </div>
                                )}
                                {r.error && (
                                  <div className="mt-2 text-rose-400 text-[10px] font-mono p-2 bg-rose-500/5 rounded border border-rose-500/10 overflow-x-auto">
                                    {r.error}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            }
            right={
              <ResizablePane
                direction="vertical"
                initialRatio={70}
                left={
                  <div className="flex flex-col h-full bg-zinc-950">
                    <div className="flex items-center justify-between p-2 border-b border-zinc-800 bg-zinc-900/30">
                      <div className="flex items-center gap-2 px-3 py-1 text-[10px] sm:text-xs font-semibold text-zinc-400">
                        <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                        Code Editor
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handlePrettify}
                          className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 hover:text-indigo-400 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2"
                          title="Prettify Code"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          Format
                        </button>
                        <button
                          onClick={handleReset}
                          className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors text-zinc-500 hover:text-rose-400"
                          title="Reset Code"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <Editor
                      value={code}
                      onChange={setCode}
                      language={language}
                    />
                  </div>
                }
                right={
                  <div className="flex flex-col h-full bg-zinc-950 border-t border-zinc-800">
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900/30 shrink-0">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Console</span>
                      {result?.console.length ? (
                         <span className="ml-auto text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full font-bold">
                           {result.console.length} LOGS
                         </span>
                      ) : null}
                    </div>
                    <div className="flex-1 overflow-auto p-4 font-mono text-[10px] sm:text-xs space-y-1">
                      {result?.console.length === 0 ? (
                        <p className="text-zinc-600 italic">No output captured</p>
                      ) : (
                        result?.console.map((log, i) => (
                          <div key={i} className="flex gap-2 whitespace-pre border-b border-zinc-900/50 pb-1">
                            <span className="text-zinc-700 select-none">[{i+1}]</span>
                            <span className="text-indigo-300">{log}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                }
              />
            }
          />
        ) : (
          <CreatorView
            newProb={newProb}
            setNewProb={setNewProb}
            onSave={saveCustomProblem}
            onCancel={() => setView("arena")}
            isEditing={isEditingCustom}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="h-10 border-t border-zinc-800 bg-zinc-950 flex items-center px-4 shrink-0 justify-between text-[8px] sm:text-[10px] text-zinc-500 font-medium">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">System Online</span>
            <span className="sm:hidden">Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="hidden sm:inline">Client-Side Runtime</span>
            <span className="sm:hidden">Runtime</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden sm:inline">Auto-saving enabled</span>
          <span>© 2026 Algorithm Arena v2.0</span>
        </div>
      </footer>
    </main>
  );
}

function CreatorView({ newProb, setNewProb, onSave, onCancel, isEditing }: { newProb: any, setNewProb: any, onSave: () => void, onCancel: () => void, isEditing: boolean }) {
  const [testCaseInput, setTestCaseInput] = useState("");
  const [testCaseExpected, setTestCaseExpected] = useState("");

  useEffect(() => {
    // When editing, if there's at least one test case, we don't need to do anything special
    // but the local state for new inputs should be empty.
    setTestCaseInput("");
    setTestCaseExpected("");
  }, [isEditing]);

  const addTestCase = () => {
    try {
      const input = JSON.parse(testCaseInput);
      const expected = JSON.parse(testCaseExpected);
      setNewProb({
        ...newProb,
        testCases: [...newProb.testCases, { input, expected }]
      });
      setTestCaseInput("");
      setTestCaseExpected("");
    } catch (e) {
      alert("Invalid JSON for input or expected value");
    }
  };

  const removeTestCase = (index: number) => {
    setNewProb({
      ...newProb,
      testCases: newProb.testCases.filter((_: any, i: number) => i !== index)
    });
  };

  return (
    <div className="h-full bg-zinc-950 overflow-auto p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8 pb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-indigo-400" />
            {isEditing ? "Edit Custom Problem" : "Create Custom Problem"}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
            >
              <Save className="w-3.5 h-3.5" />
              {isEditing ? "Update Problem" : "Save Problem"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Problem Title</label>
              <input
                value={newProb.title}
                onChange={e => setNewProb({...newProb, title: e.target.value})}
                placeholder="e.g. Sum of Squares"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Description</label>
              <textarea
                value={newProb.description}
                onChange={e => setNewProb({...newProb, description: e.target.value})}
                placeholder="Describe the problem..."
                rows={5}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-all resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Difficulty</label>
                <select
                  value={newProb.difficulty}
                  onChange={e => setNewProb({...newProb, difficulty: e.target.value as any})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-all"
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Category</label>
                <input
                  value={newProb.category}
                  onChange={e => setNewProb({...newProb, category: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Function Name</label>
              <input
                value={newProb.methodName}
                onChange={e => setNewProb({...newProb, methodName: e.target.value})}
                placeholder="e.g. solve"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-all font-mono"
              />
              <p className="text-[10px] text-zinc-600 mt-1">This will be used as the method name across all languages.</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Parameters (comma separated)</label>
              <input
                value={newProb.parameters?.join(', ')}
                onChange={e => setNewProb({...newProb, parameters: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                placeholder="e.g. nums, target"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-all font-mono"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-8">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Test Cases
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-6">
            <div className="sm:col-span-5">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Input (JSON Array)</label>
              <input
                value={testCaseInput}
                onChange={e => setTestCaseInput(e.target.value)}
                placeholder="[1, 2, 3]"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-all font-mono"
              />
            </div>
            <div className="sm:col-span-5">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Expected Output (JSON)</label>
              <input
                value={testCaseExpected}
                onChange={e => setTestCaseExpected(e.target.value)}
                placeholder="6"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-all font-mono"
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <button
                onClick={addTestCase}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-all"
              >
                Add Case
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {newProb.testCases?.map((tc: TestCase, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <div className="flex gap-6 text-[11px]">
                  <div className="flex gap-2">
                    <span className="text-zinc-600 font-bold">IN:</span>
                    <span className="text-zinc-400 font-mono">{JSON.stringify(tc.input)}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-zinc-600 font-bold">OUT:</span>
                    <span className="text-zinc-400 font-mono">{JSON.stringify(tc.expected)}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeTestCase(i)}
                  className="p-1 hover:bg-rose-500/10 rounded-md text-zinc-600 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }: { active: boolean, onClick: () => void, icon: any, children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
        active ? "bg-indigo-500/10 text-indigo-400 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  );
}
