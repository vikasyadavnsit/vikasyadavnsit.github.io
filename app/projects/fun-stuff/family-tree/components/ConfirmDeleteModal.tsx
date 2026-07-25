'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X } from 'lucide-react';

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({ message, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-xl"
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/20 rounded-xl">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-white font-semibold">Confirm Delete</h3>
        </div>

        <p className="text-zinc-400 text-sm mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors text-sm"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}
