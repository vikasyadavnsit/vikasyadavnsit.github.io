'use client';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { AppView, ActiveModal, FamilyTree } from './types';
import {
  getAllTrees, createTree, deleteTree, saveTree, getTreeIndex, saveTreeIndex,
} from './lib/storage';
import { decodeShareHash, exportTreeAsJSON } from './lib/share';
import { encodeShareHash } from './lib/share';
import Dashboard from './components/Dashboard';
import TreeEditor from './components/TreeEditor';
import CreateTreeModal from './components/CreateTreeModal';
import ImportModal from './components/ImportModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';

export default function FamilyTreePage() {
  const [view, setView] = useState<AppView>({ kind: 'dashboard' });
  const [trees, setTrees] = useState<FamilyTree[]>([]);
  const [modal, setModal] = useState<ActiveModal>({ kind: 'none' });
  const [toast, setToast] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = getAllTrees();
    setTrees(loaded);

    // Check for share hash in URL
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      decodeShareHash(hash.slice(1)).then((tree) => {
        if (tree) {
          setModal({ kind: 'import', preloadedTree: tree });
          history.replaceState(null, '', window.location.pathname);
        }
      });
    }

    setReady(true);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function refreshTrees() {
    setTrees(getAllTrees());
  }

  function handleCreateTree(name: string) {
    const tree = createTree(name);
    refreshTrees();
    setModal({ kind: 'none' });
    setView({ kind: 'editor', treeId: tree.id });
  }

  function handleDeleteTree(id: string) {
    deleteTree(id);
    refreshTrees();
    setModal({ kind: 'none' });
    if (view.kind === 'editor' && view.treeId === id) {
      setView({ kind: 'dashboard' });
    }
  }

  async function handleShare(id: string) {
    const tree = trees.find((t) => t.id === id);
    if (!tree) return;
    try {
      const hash = await encodeShareHash(tree);
      const url = `${window.location.origin}${window.location.pathname}#${hash}`;
      await navigator.clipboard.writeText(url);
      showToast('Share link copied!');
    } catch {
      showToast('Could not copy to clipboard.');
    }
  }

  function handleImport(tree: FamilyTree) {
    saveTree(tree);
    const index = getTreeIndex();
    if (!index.includes(tree.id)) {
      saveTreeIndex([...index, tree.id]);
    }
    refreshTrees();
    setModal({ kind: 'none' });
  }

  function handleTreeUpdated(updated: FamilyTree) {
    setTrees((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-zinc-600">Loading...</p>
      </div>
    );
  }

  return (
    <>
      {view.kind === 'dashboard' && (
        <Dashboard
          trees={trees}
          onCreateNew={() => setModal({ kind: 'create-tree' })}
          onImport={() => setModal({ kind: 'import' })}
          onOpen={(id) => setView({ kind: 'editor', treeId: id })}
          onDelete={(id) => setModal({ kind: 'delete-tree', treeId: id })}
          onExport={(id) => {
            const t = trees.find((tr) => tr.id === id);
            if (t) exportTreeAsJSON(t);
          }}
          onShare={handleShare}
        />
      )}

      {view.kind === 'editor' && (
        <TreeEditor
          treeId={view.treeId}
          onBack={() => setView({ kind: 'dashboard' })}
          onTreeUpdated={handleTreeUpdated}
        />
      )}

      <AnimatePresence>
        {modal.kind === 'create-tree' && (
          <CreateTreeModal
            key="create"
            onConfirm={handleCreateTree}
            onClose={() => setModal({ kind: 'none' })}
          />
        )}

        {modal.kind === 'import' && (
          <ImportModal
            key="import"
            preloadedTree={(modal as { kind: 'import'; preloadedTree?: FamilyTree }).preloadedTree}
            onImport={handleImport}
            onClose={() => setModal({ kind: 'none' })}
          />
        )}

        {modal.kind === 'delete-tree' && (
          <ConfirmDeleteModal
            key="del-tree"
            message={`Delete "${trees.find((t) => t.id === (modal as { kind: 'delete-tree'; treeId: string }).treeId)?.name ?? 'this tree'}"? This cannot be undone.`}
            onConfirm={() => handleDeleteTree((modal as { kind: 'delete-tree'; treeId: string }).treeId)}
            onCancel={() => setModal({ kind: 'none' })}
          />
        )}
      </AnimatePresence>

      {/* Global toast for dashboard share action */}
      <AnimatePresence>
        {toast && view.kind === 'dashboard' && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-full text-sm text-white shadow-xl z-50">
            {toast}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
