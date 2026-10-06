import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';

interface AddNoteFormProps {
  /** Resolves true once the note is saved (tags + embedding included). */
  onAdd: (text: string, category: string, tags: string[]) => Promise<boolean>;
  categories: Array<{ id: number; name: string }>;
  isProcessing: boolean;
}

export function AddNoteForm({ onAdd, categories, isProcessing }: AddNoteFormProps) {
  const [newNote, setNewNote] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'Personal');
  const [isSaving, setIsSaving] = useState(false);

  const busy = isProcessing || isSaving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || busy) return;
    setIsSaving(true);
    try {
      // Tags, category and embedding are all computed on Save, in the worker.
      // Manual #hashtags in the text are picked up there too.
      const saved = await onAdd(newNote, category, []);
      if (saved) setNewNote('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">Note Content</label>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          disabled={busy}
          className="w-full h-32 bg-zinc-900 rounded-xl border-0 ring-1 ring-zinc-800 focus:ring-2 focus:ring-indigo-500/50 text-zinc-200 p-4 resize-none transition-shadow disabled:opacity-60"
          placeholder="Write your note. Tags are suggested when you save; add your own with #hashtags."
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={busy}
          className="w-full bg-zinc-900 rounded-xl border-0 ring-1 ring-zinc-800 focus:ring-2 focus:ring-indigo-500/50 text-zinc-200 p-4 appearance-none"
        >
          {categories.length > 0 ? (
            categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))
          ) : (
            <option>Personal</option>
          )}
        </select>
      </div>

      <button
        type="submit"
        disabled={busy || !newNote.trim()}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        {busy ? 'Tagging & saving…' : 'Save Note'}
      </button>
    </form>
  );
}
