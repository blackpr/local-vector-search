import { Trash2, FileText, Tag } from 'lucide-react';

// Truncate helper
function truncate(str: string, length: number) {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

interface NoteListProps {
  notes: Array<{ id: number; text: string; category: string; created_at: string }>;
  onDelete: (id: number) => void;
  onNoteClick: (note: any) => void;
  onCategoryClick?: (category: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function NoteList({ notes, onDelete, onNoteClick, onCategoryClick, onLoadMore, hasMore }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <div className="text-center py-20 animate-in fade-in duration-700">
        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-zinc-800 shadow-xl shadow-indigo-500/5">
          <FileText className="w-10 h-10 text-zinc-600" />
        </div>
        <h3 className="text-xl font-medium text-zinc-300 tracking-tight">Empty Canvas</h3>
        <p className="text-zinc-500 mt-2 max-w-sm mx-auto font-light">
          Your thoughts are indexed locally. Start writing to build your personal knowledge base.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 pb-20">
      {notes.map((note) => (
        <div
          key={note.id}
          onClick={() => onNoteClick(note)}
          className="group relative bg-zinc-900/40 hover:bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 hover:border-indigo-500/30 p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer overflow-hidden"
        >
          {/* Header Row */}
          <div className="flex justify-between items-center mb-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onCategoryClick && note.category) onCategoryClick(note.category);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold bg-zinc-800 text-zinc-400 hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors border border-zinc-700/50 hover:border-indigo-500/30 z-10"
            >
              <Tag className="w-3 h-3" />
              {note.category || 'Uncategorized'}
            </button>

            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-mono">
                {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(note.id);
                }}
                className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-zinc-300 leading-7 font-sans text-sm line-clamp-3 opacity-90 group-hover:opacity-100 transition-opacity">
            {truncate(note.text, 300)}
          </p>
        </div>
      ))}

      {onLoadMore && (
        <div className="pt-4 text-center">
          <button
            onClick={onLoadMore}
            disabled={!hasMore}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            {hasMore ? 'Load More Notes' : 'No More Notes'}
          </button>
        </div>
      )}
    </div>
  );
}
