'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trees, X } from 'lucide-react';

interface Props {
  onConfirm: (name: string) => void;
  onClose: () => void;
}

export default function CreateTreeModal({ onConfirm, onClose }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name for your family tree.');
      return;
    }
    onConfirm(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-xl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-500/20 rounded-xl">
            <Trees className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-white font-semibold">New Family Tree</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tree Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="e.g. The Smith Family"
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 text-sm"
              autoFocus
            />
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-colors text-sm"
            >
              Create
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
