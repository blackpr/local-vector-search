import { Folder, RefreshCw, Brain } from 'lucide-react';
import { StatusBadge } from '../StatusBadge';

interface HeaderProps {
  status: string;
  progress: any;
  error: string | null;
  onShowCategoryManager: () => void;
  onShowSyncModal: () => void;
  onReset: () => void;
}

export const Header = ({
  status,
  progress,
  error,
  onShowCategoryManager,
  onShowSyncModal,
  onReset
}: HeaderProps) => {
  return (
    <header className="mb-8 text-center space-y-2 relative">
      <div className="absolute right-0 top-0 hidden md:flex items-center gap-2">
        <button
          onClick={onShowCategoryManager}
          className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Manage Categories"
        >
          <Folder className="w-5 h-5" />
        </button>
        <button
          onClick={onShowSyncModal}
          className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Sync Notes"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div
        onClick={onReset}
        className="cursor-pointer inline-flex items-center justify-center p-3 bg-zinc-900 rounded-2xl ring-1 ring-zinc-800 shadow-lg shadow-indigo-500/10 mb-4 hover:ring-indigo-500/50 transition-all hover:scale-105 active:scale-95"
      >
        <Brain className="w-8 h-8 text-indigo-400" />
      </div>

      <h1
        onClick={onReset}
        className="cursor-pointer text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent flex items-center justify-center gap-4 hover:opacity-80 transition-opacity"
      >
        Second Brain
        <div className="md:hidden flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowCategoryManager();
            }}
            className="p-1 text-zinc-500 hover:text-indigo-400"
          >
            <Folder className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowSyncModal();
            }}
            className="p-1 text-zinc-500 hover:text-indigo-400"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </h1>
      <p className="text-zinc-500">
        Offline Semantic Search Engine
      </p>

      <div className="flex flex-col items-center justify-center gap-2 text-xs font-medium mt-4 h-8">
        <StatusBadge status={status} progress={status === 'error' ? (error || '') : progress} />
      </div>
    </header>
  );
};
