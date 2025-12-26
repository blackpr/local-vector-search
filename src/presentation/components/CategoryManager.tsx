import { useState } from 'react';
import { X, Plus, Trash2, Folder } from 'lucide-react';

interface CategoryManagerProps {
  categories: Array<{ id: number; name: string }>;
  onAdd: (name: string) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

export function CategoryManager({ categories, onAdd, onDelete, onClose }: CategoryManagerProps) {
  const [newCategory, setNewCategory] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategory.trim()) {
      onAdd(newCategory.trim());
      setNewCategory('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-xl shadow-2xl ring-1 ring-zinc-800 w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Folder className="w-5 h-5 text-indigo-400" />
            Manage Categories
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-zinc-800 bg-zinc-900/30">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name..."
              className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!newCategory.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {categories.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              No categories yet.
            </div>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/50 transition-colors">
                <span className="text-zinc-300 font-medium">{cat.name}</span>
                <button
                  onClick={() => onDelete(cat.id)}
                  className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-red-400/10 rounded"
                  title="Delete Category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
