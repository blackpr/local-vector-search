import { Loader2 } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  progress: any;
}

export function StatusBadge({ status, progress }: StatusBadgeProps) {
  if (status === 'loading') {
    if (progress) {
      return (
        <div className="flex items-center gap-2" title={`Downloading Model... ${Math.round(progress.progress)}%`}>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
          <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <span className="text-xs text-amber-400 tabular-nums">{Math.round(progress.progress)}%</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5" title="Initializing AI...">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
        <span className="text-xs text-amber-400">Initializing...</span>
      </div>
    );
  }
  if (status === 'ready') {
    return (
      <div className="flex items-center gap-1.5" title="System Ready">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-emerald-400">Ready</span>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5" title={typeof progress === 'string' ? progress : 'Unknown Error'}>
        <div className="w-2 h-2 rounded-full bg-red-400" />
        <span className="text-xs text-red-400">Error</span>
      </div>
    );
  }
  return (
    <span className="text-xs text-zinc-600">Waiting...</span>
  );
}
