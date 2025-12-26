import { Folder, RefreshCw, Network } from 'lucide-react';
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
    <header className="mb-8 relative">
      {/* Ambient background glow */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ animationDuration: '4s' }} />

      <div className="relative flex items-center justify-between gap-6 pb-6">
        {/* Left: Logo + Branding */}
        <div
          onClick={onReset}
          className="cursor-pointer flex items-center gap-4 group"
        >
          {/* Network Icon with breathing animation */}
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl group-hover:bg-indigo-500/30 transition-all duration-700 animate-pulse"
              style={{ animationDuration: '3s' }} />
            <div className="relative flex items-center justify-center w-12 h-12 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 rounded-2xl ring-1 ring-white/5 shadow-2xl group-hover:ring-indigo-500/30 transition-all duration-500 group-hover:scale-105">
              <Network className="w-6 h-6 text-indigo-400 group-hover:text-indigo-300 transition-colors duration-500"
                style={{ filter: 'drop-shadow(0 0 8px rgba(129, 140, 248, 0.3))' }} />
              <StatusIndicator status={status} />
            </div>
          </div>

          {/* Branding */}
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl md:text-3xl font-light tracking-wide text-white group-hover:text-indigo-100 transition-colors duration-500"
              style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif', letterSpacing: '0.02em' }}>
              Latent
            </h1>
            <p className="text-[11px] md:text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors duration-500 leading-relaxed whitespace-nowrap"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.01em' }}>
              {status === 'loading' && progress ? (
                <span className="inline-flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                  </span>
                  <span className="text-amber-400/90">
                    Loading models... {Math.round(progress.progress)}%
                  </span>
                </span>
              ) : (
                <span className="hidden md:inline">Explore the space between your thoughts, entirely offline.</span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onShowCategoryManager}
            className="group/btn relative p-2.5 text-zinc-500 hover:text-indigo-300 rounded-xl transition-all duration-300 hover:bg-white/5"
            title="Manage Categories"
          >
            <div className="absolute inset-0 bg-indigo-500/0 group-hover/btn:bg-indigo-500/10 rounded-xl blur transition-all duration-300" />
            <Folder className="relative w-[18px] h-[18px] transition-transform duration-300 group-hover/btn:scale-110" />
          </button>
          <button
            onClick={onShowSyncModal}
            className="group/btn relative p-2.5 text-zinc-500 hover:text-indigo-300 rounded-xl transition-all duration-300 hover:bg-white/5"
            title="Sync Notes"
          >
            <div className="absolute inset-0 bg-indigo-500/0 group-hover/btn:bg-indigo-500/10 rounded-xl blur transition-all duration-300" />
            <RefreshCw className="relative w-[18px] h-[18px] transition-transform duration-300 group-hover/btn:rotate-90" />
          </button>
        </div>
      </div>

      {/* Refined bottom border with progress */}
      <div className="relative h-[1px] bg-gradient-to-r from-transparent via-zinc-800/50 to-transparent">
        {status === 'loading' && progress && (
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500/50 via-amber-500/50 to-indigo-500/50 shadow-lg shadow-amber-500/20 transition-all duration-500"
            style={{
              width: `${progress.progress}%`,
              filter: 'blur(0.5px)'
            }}
          />
        )}
      </div>
    </header>
  );
};
