import { Loader2 } from 'lucide-react';

interface StatusIndicatorProps {
  status: string;
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  if (status === 'loading') {
    return (
      <div className="absolute -top-0.5 -right-0.5" title="Initializing AI...">
        <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
      </div>
    );
  }

  if (status === 'ready') {
    return (
      <div
        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-900 animate-pulse"
        title="System Ready"
      />
    );
  }

  if (status === 'error') {
    return (
      <div
        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-400 ring-2 ring-zinc-900"
        title="System Error"
      />
    );
  }

  return null;
}
