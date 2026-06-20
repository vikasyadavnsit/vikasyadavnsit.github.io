"use client";
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { WorkflowBuilder } from './components/WorkflowBuilder';

export default function WorkflowBuilderPage() {
  return (
    <main className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 h-12 border-b border-zinc-800 flex-shrink-0">
        <Link
          href="/projects/creative-stuff"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors group"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
          Creative Stuff
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-xs font-semibold text-white">Workflow Builder</span>
        <span className="ml-auto text-[10px] text-zinc-600 hidden md:block">Drag nodes from the left panel · Click a node to configure · Press Delete to remove</span>
      </div>
      <div className="flex-1 min-h-0">
        <WorkflowBuilder />
      </div>
    </main>
  );
}
