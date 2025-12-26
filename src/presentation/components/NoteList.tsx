import { Trash2, FileText, Tag, Hash, Pin, PinOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import { ConfirmationModal } from './ConfirmationModal';
import clsx from 'clsx';

// Truncate helper
function truncate(str: string, length: number) {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

interface NoteListProps {
  notes: Array<{ id: number; text: string; category: string; tags?: string[]; isPinned?: boolean; created_at: string | Date; distance?: number }>;
  onDelete: (id: number) => void;
  onNoteClick: (note: any) => void;
  onCategoryClick?: (category: string) => void;
  onTagClick?: (tag: string) => void;
  onPin?: (note: any) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function NoteList({ notes, onDelete, onNoteClick, onCategoryClick, onTagClick, onPin, onLoadMore, hasMore }: NoteListProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null);

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
    <>
      <div className="grid gap-4 pb-20">
        {notes.map((note) => (
          <div
            key={note.id}
            onClick={() => onNoteClick(note)}
            className={clsx(
              "group relative bg-zinc-900/40 hover:bg-zinc-900/80 backdrop-blur-sm rounded-2xl border transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer overflow-hidden",
              note.isPinned ? "border-indigo-500/40 bg-indigo-500/5 shadow-indigo-500/5" : "border-zinc-800/50 hover:border-indigo-500/30"
            )}
          >
            {/* Header Row */}
            <div className="flex justify-between items-start mb-3 p-5 pb-0">
              <div className="flex flex-wrap gap-2 items-center">
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

                {note.tags && note.tags.map((tag, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onTagClick) onTagClick(tag);
                    }}
                    className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-mono bg-zinc-800/30 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 border border-zinc-800/50 hover:border-indigo-500/30 transition-colors"
                  >
                    <Hash className="w-2.5 h-2.5 opacity-50" />
                    {tag}
                  </button>
                ))}

                {note.distance !== undefined && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 ml-2">
                    {((1 - note.distance) * 100).toFixed(0)}% Match
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 ml-2 shrink-0">
                {onPin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPin(note);
                    }}
                    className={clsx(
                      "p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100",
                      note.isPinned ? "text-indigo-400 hover:text-indigo-300 opacity-100" : "text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10"
                    )}
                    title={note.isPinned ? "Unpin note" : "Pin note"}
                  >
                    {note.isPinned ? <Pin className="w-4 h-4 fill-current" /> : <Pin className="w-4 h-4" />}
                  </button>
                )}

                <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-mono">
                  {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(note.id);
                  }}
                  className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-zinc-300 font-sans text-sm line-clamp-3 opacity-90 group-hover:opacity-100 transition-opacity prose prose-invert prose-p:my-0 prose-headings:text-sm prose-headings:font-bold prose-headings:my-1 prose-ul:my-0 prose-li:my-0 max-w-none p-5 pt-3">
              <ReactMarkdown>{truncate(note.text, 500)}</ReactMarkdown>
            </div>
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

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) onDelete(deleteId);
        }}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
      />
    </>
  );
}
