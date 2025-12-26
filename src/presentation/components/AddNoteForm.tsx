import { useState } from 'react';
import { Plus, Loader2, X } from 'lucide-react';

interface AddNoteFormProps {
  onAdd: (text: string, category: string, tags: string[]) => void;
  categories: Array<{ id: number; name: string }>;
  isProcessing: boolean;
  onAutoCategory?: (text: string) => Promise<string | null>;
  onAutoTags?: (text: string) => Promise<string[]>;
}

export function AddNoteForm({ onAdd, categories, isProcessing, onAutoCategory, onAutoTags }: AddNoteFormProps) {
  const [newNote, setNewNote] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'Personal');
  const [tags, setTags] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAdd(newNote, category, tags);
    setNewNote('');
    setTags([]);
    setIsSuggesting(false);
  };

  const handleBlur = async () => {
    // Only trigger if we have enough text
    if (newNote.trim().length > 5 && !isProcessing) {
      await triggerAutoTagging();
    }
  };

  const triggerAutoTagging = async () => {
    setIsSuggesting(true);

    try {
      const catPromise = onAutoCategory ? onAutoCategory(newNote) : Promise.resolve(null);
      const tagPromise = onAutoTags ? onAutoTags(newNote) : Promise.resolve([]);

      const [suggestedCat, suggestedTags] = await Promise.all([catPromise, tagPromise]);

      if (suggestedCat) setCategory(suggestedCat);

      if (suggestedTags && suggestedTags.length > 0) {
        setTags(prev => {
          const splitTags = suggestedTags.flatMap(t => t.split(',').map(s => s.trim()));
          const unique = new Set([...prev, ...splitTags]);
          return Array.from(unique).filter(t => t.length > 0);
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">Note Content</label>
        <div className="relative group">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onBlur={handleBlur}
            className="w-full h-32 bg-zinc-900 rounded-xl border-0 ring-1 ring-zinc-800 focus:ring-2 focus:ring-indigo-500/50 text-zinc-200 p-4 resize-none transition-shadow"
            placeholder="Type at least 5 chars to generate tags..."
          />
          {isSuggesting && (
            <div className="absolute top-4 right-4 text-xs text-indigo-400 animate-pulse bg-indigo-500/10 px-2 py-1 rounded-full flex gap-2 items-center">
              <Loader2 className="w-3 h-3 animate-spin" /> Processing...
            </div>
          )}
        </div>
      </div>

      {/* Tags Display */}
      <div className="min-h-[24px]">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-in fade-in">
            {tags.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 rounded-full text-xs text-zinc-300 border border-zinc-700/50">
                #{t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="text-zinc-500 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
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
        disabled={isProcessing || isSuggesting || !newNote.trim()}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
      >
        {isProcessing || isSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Save Note
      </button>
    </form>
  );
}
