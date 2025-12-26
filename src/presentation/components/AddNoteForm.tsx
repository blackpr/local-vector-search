import { Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface AddNoteFormProps {
  onAdd: (text: string, category: string) => void;
  isProcessing: boolean;
}

export function AddNoteForm({ onAdd, isProcessing }: AddNoteFormProps) {
  const [newNote, setNewNote] = useState('');
  const [category, setCategory] = useState('Personal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAdd(newNote, category);
    setNewNote('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">Note Content</label>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="w-full h-32 bg-zinc-900 rounded-xl border-0 ring-1 ring-zinc-800 focus:ring-2 focus:ring-indigo-500/50 text-zinc-200 p-4 resize-none"
          placeholder="What's on your mind?"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-zinc-900 rounded-xl border-0 ring-1 ring-zinc-800 focus:ring-2 focus:ring-indigo-500/50 text-zinc-200 p-4"
        >
          <option>Personal</option>
          <option>Work</option>
          <option>Ideas</option>
          <option>Recipes</option>
          <option>Journal</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={isProcessing || !newNote.trim()}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Save Thought
      </button>
    </form>
  );
}
