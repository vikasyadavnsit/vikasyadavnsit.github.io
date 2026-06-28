'use client';
import { motion } from 'framer-motion';
import { Plus, Upload, Trees } from 'lucide-react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { FamilyTree } from '../types';
import TreeCard from './TreeCard';

interface Props {
  trees: FamilyTree[];
  onCreateNew: () => void;
  onImport: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  onShare: (id: string) => void;
}

export default function Dashboard({ trees, onCreateNew, onImport, onOpen, onDelete, onExport, onShare }: Props) {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-6 pt-28 pb-20">
        {/* Back nav */}
        <Link
          href="/projects/fun-stuff"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm mb-10"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to Fun Stuff
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12"
        >
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Family <span className="text-muted-foreground">Trees</span>
            </h1>
            <p className="mt-2 text-zinc-400 text-sm max-w-md">
              Build, visualize, and share your family history. All data stored locally in your browser.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onImport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={onCreateNew}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Tree
            </button>
          </div>
        </motion.div>

        {/* Grid */}
        {trees.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="p-6 rounded-3xl bg-green-500/10 mb-6">
              <Trees className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No family trees yet</h2>
            <p className="text-zinc-500 text-sm mb-8 max-w-xs">
              Create your first family tree to start mapping your family history with photos and relationships.
            </p>
            <button
              onClick={onCreateNew}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create your first tree
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trees.map((tree, i) => (
              <TreeCard
                key={tree.id}
                tree={tree}
                index={i}
                onOpen={() => onOpen(tree.id)}
                onDelete={() => onDelete(tree.id)}
                onExport={() => onExport(tree.id)}
                onShare={() => onShare(tree.id)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
