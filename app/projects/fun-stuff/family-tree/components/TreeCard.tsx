'use client';
import { motion } from 'framer-motion';
import { ExternalLink, Download, Share2, Trash2, Users, Calendar } from 'lucide-react';
import type { FamilyTree } from '../types';

interface Props {
  tree: FamilyTree;
  index: number;
  onOpen: () => void;
  onDelete: () => void;
  onExport: () => void;
  onShare: () => void;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TreeCard({ tree, index, onOpen, onDelete, onExport, onShare }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative flex flex-col bg-card/40 backdrop-blur-xl border border-border rounded-[2rem] p-6 hover:border-green-500/40 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500 to-teal-500 flex-shrink-0">
          <Users className="w-5 h-5 text-white" />
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Info */}
      <h3 className="text-white font-semibold text-lg mb-1 truncate">{tree.name}</h3>
      <div className="flex items-center gap-4 text-sm text-zinc-500 mb-4">
        <span>{tree.members.length} {tree.members.length === 1 ? 'member' : 'members'}</span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(tree.createdAt)}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-auto flex items-center gap-2">
        <button
          onClick={onOpen}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open
        </button>
        <button
          onClick={onShare}
          className="p-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          title="Share"
        >
          <Share2 className="w-4 h-4" />
        </button>
        <button
          onClick={onExport}
          className="p-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          title="Export JSON"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
