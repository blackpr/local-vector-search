import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, onUndo, onDismiss, duration = 10000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-slide-up"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-xl border border-zinc-700/50 shadow-2xl shadow-black/50 min-w-[320px]">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>

        {/* Message */}
        <div className="flex-1">
          <p className="text-zinc-100 font-medium tracking-tight">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25"
          >
            Undo
          </button>
          <button
            onClick={onDismiss}
            className="w-8 h-8 rounded-lg hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors duration-200 flex items-center justify-center"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800/50 rounded-b-2xl overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-progress"
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  );
}
