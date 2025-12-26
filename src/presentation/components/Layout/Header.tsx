import { Folder, RefreshCw, Brain } from 'lucide-react';
import { StatusIndicator } from '../StatusIndicator';

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
  onShowCategoryManager,
  onShowSyncModal,
  onReset
}: HeaderProps) => {
  return (
    <header className="mb-6 relative">
      <div className="flex items-center justify-between gap-4 pb-4">
        {/* Left: Logo + Title with integrated status */}
        <div
          onClick={onReset}
          className="cursor-pointer flex items-center gap-3 hover:opacity-80 transition-opacity group"
        >
          <div className="relative flex items-center justify-center p-2 bg-zinc-900 rounded-xl ring-1 ring-zinc-800 shadow-lg shadow-indigo-500/10 group-hover:ring-indigo-500/50 transition-all group-hover:scale-105 group-active:scale-95">
            <Brain className="w-6 h-6 text-indigo-400" />
            {/* Status dot indicator */}
            <StatusIndicator status={status} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
              Second Brain
            </h1>
            <p className="text-xs text-zinc-500 hidden md:block">
              {status === 'loading' && progress ? (
                <span className="text-amber-400">
                  Downloading model... {Math.round(progress.progress)}%
                </span>
              ) : (
                'Offline Semantic Search'
              )}
            </p>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
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
      </div>

      {/* Bottom border with integrated progress bar */}
      <div className="relative h-px bg-zinc-800/50">
        {status === 'loading' && progress && (
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
            style={{ width: `${progress.progress}%` }}
          />
        )}
      </div>
    </header>
  );
};
