import { Loader2 } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  progress: any;
}

export function StatusBadge({ status, progress }: StatusBadgeProps) {
  if (status === 'loading') {
    if (progress) {
      return (
        <div className="flex flex-col items-center gap-1 w-64">
          <span className="flex items-center gap-1.5 text-amber-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Downloading Model... {Math.round(progress.progress)}%
          </span>
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      );
    }
    return <span className="flex items-center gap-1.5 text-amber-400"><Loader2 className="w-3 h-3 animate-spin" /> Initializing AI...</span>;
  }
  if (status === 'ready') {
    return <span className="flex items-center gap-1.5 text-emerald-400"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> System Ready</span>;
  }
  if (status === 'error') {
    return <span className="flex items-center gap-1.5 text-red-400"><div className="w-2 h-2 rounded-full bg-red-400" /> System Error</span>;
  }
  return <span className="text-zinc-600">Waiting...</span>;
}
