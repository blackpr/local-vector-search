import { Trash2, Sparkles } from 'lucide-react';

// Extend Note slightly for what we used in the UI (id, text, category, created_at)
// But our domain Note uses `createdAt` as Date. 
// The worker returns formatted objects usually, but let's stick to the domain Note for props if possible.
// Wait, the worker sends messages. The hook receives them.
// The hook `allNotes` currently mimics the shape from `worker.ts` -> `NOTES_LISTED`.
// `results: Array<{ id: number; text: string; category: string; created_at: string }>`
// So the props should probably accept that shape or I should transform it in the hook.
// For now, let's adapt to what the UI receives.

interface NoteListProps {
  notes: any[]; // Using any[] to match the hook output for now, or define interface
  onDelete: (id: number) => void;
}

export function NoteList({ notes, onDelete }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-600">
        <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p>No thoughts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <div key={note.id} className="group p-4 rounded-xl bg-zinc-900/50 ring-1 ring-zinc-800 hover:bg-zinc-900 hover:ring-zinc-700 transition-all duration-300">
          <div className="flex justify-between items-start gap-4">
            <p className="text-zinc-200 leading-relaxed">{note.text}</p>
            <button
              onClick={() => onDelete(note.id)}
              className="shrink-0 p-2 text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
              title="Delete note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2 justify-between">
            <span className="text-xs font-medium text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-md">
              {note.category}
            </span>
            <span className="text-xs text-zinc-600">
              {/* Handle both Date object or string from JSON */}
              {new Date(note.created_at || note.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
