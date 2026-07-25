'use client';
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Link2, FileJson, Upload } from 'lucide-react';
import type { FamilyTree } from '../types';
import { decodeShareHash, importTreeFromJSON } from '../lib/share';

interface Props {
  preloadedTree?: FamilyTree;
  onImport: (tree: FamilyTree) => void;
  onClose: () => void;
}

type Tab = 'url' | 'file';

export default function ImportModal({ preloadedTree, onImport, onClose }: Props) {
  const [tab, setTab] = useState<Tab>(preloadedTree ? 'url' : 'url');
  const [urlInput, setUrlInput] = useState('');
  const [preview, setPreview] = useState<FamilyTree | null>(preloadedTree ?? null);
  const [importName, setImportName] = useState(preloadedTree?.name ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleDecode() {
    setError('');
    setLoading(true);
    try {
      const hash = urlInput.trim();
      const extracted = hash.includes('#') ? hash.split('#')[1] : hash;
      const tree = await decodeShareHash(extracted);
      if (!tree) { setError('Could not decode this link. Make sure you pasted the full share URL.'); return; }
      setPreview(tree);
      setImportName(tree.name);
    } catch {
      setError('Failed to decode the URL.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setLoading(true);
    try {
      const tree = await importTreeFromJSON(file);
      if (!tree) { setError('Invalid JSON file. Make sure it was exported from Family Tree.'); return; }
      setPreview(tree);
      setImportName(tree.name);
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    if (!preview) return;
    const finalTree: FamilyTree = {
      ...preview,
      id: crypto.randomUUID(),
      name: importName.trim() || preview.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onImport(finalTree);
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
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-white font-semibold mb-4">Import Family Tree</h3>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-zinc-800 p-1 rounded-xl">
          {(['url', 'file'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPreview(null); setError(''); setUrlInput(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              {t === 'url' ? <Link2 className="w-4 h-4" /> : <FileJson className="w-4 h-4" />}
              {t === 'url' ? 'From URL' : 'From JSON File'}
            </button>
          ))}
        </div>

        {tab === 'url' && (
          <div className="space-y-3 mb-4">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setError(''); setPreview(null); }}
              placeholder="Paste the share URL or hash here..."
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 text-sm"
              autoFocus={!preloadedTree}
            />
            <button
              onClick={handleDecode}
              disabled={!urlInput.trim() || loading}
              className="w-full py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white text-sm transition-colors"
            >
              {loading ? 'Decoding...' : 'Decode'}
            </button>
          </div>
        )}

        {tab === 'file' && (
          <div className="mb-4">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 py-8 border-2 border-dashed border-zinc-700 rounded-xl hover:border-green-500 text-zinc-400 hover:text-white transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span className="text-sm">{loading ? 'Reading file...' : 'Click to select a .json file'}</span>
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFile} />
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {preview && (
          <div className="bg-zinc-800 rounded-xl p-4 mb-4 space-y-3">
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Preview</p>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Tree Name</label>
              <input
                type="text"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
              />
            </div>
            <p className="text-zinc-400 text-sm">
              {preview.members.length} members · {preview.relationships.length} relationships
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!preview}
            className="flex-1 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-medium transition-colors text-sm"
          >
            Import Tree
          </button>
        </div>
      </motion.div>
    </div>
  );
}
