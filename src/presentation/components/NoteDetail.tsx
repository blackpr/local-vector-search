import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Trash2, Tag, Edit2, Eye, X, Loader2 } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';


interface NoteDetailProps {
  note: {
    id: number;
    text: string;
    category: string;
    tags?: string[];
    created_at: string;
  };
  onBack: () => void;
  onSave: (id: number, text: string, category: string, tags: string[]) => Promise<void>;
  onDelete: (id: number) => void;
  onAutoTags?: (text: string) => Promise<string[]>;
}

export function NoteDetail({ note, onBack, onDelete, onSave, onAutoTags }: NoteDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(note.text);
  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [isProcessingTags, setIsProcessingTags] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Sync state if note prop updates
  useEffect(() => {
    setText(note.text);
    setTags(note.tags || []);
  }, [note]);

  const handleBlur = async () => {
    if (isEditing && text.trim().length > 5 && onAutoTags && !isProcessingTags) {
      setIsProcessingTags(true);
      try {
        const potentialTags = await onAutoTags(text);
        if (potentialTags && potentialTags.length > 0) {
          setTags(prev => {
            const splitTags = potentialTags.flatMap(t => t.split(',').map(s => s.trim()));
            const unique = new Set([...prev, ...splitTags]);
            return Array.from(unique).filter(t => t.length > 0);
          });
        }
      } catch (e) {
        console.error("Auto-tag failed", e);
      } finally {
        setIsProcessingTags(false);
      }
    }
  };

  const removeTag = (t: string) => {
    setTags(prev => prev.filter(tag => tag !== t));
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h2 className="font-semibold text-lg leading-tight">Note Details</h2>
            <span className="text-xs text-zinc-500 font-mono">{new Date(note.created_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${isEditing ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
          >
            {isEditing ? <><Eye className="w-4 h-4" /> Preview</> : <><Edit2 className="w-4 h-4" /> Edit</>}
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            title="Delete Note"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full">
        {/* Tags Section */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {note.category && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
              <Tag className="w-3 h-3" />
              {note.category}
            </span>
          )}

          {/* Editing Mode Tags */}
          {isEditing ? (
            <>
              {tags.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 rounded-full text-xs text-zinc-300 border border-zinc-700/50">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="text-zinc-500 hover:text-red-400 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {isProcessingTags && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-indigo-400 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" /> Tagging...
                </span>
              )}
            </>
          ) : (
            // View Mode Tags
            tags.map((tag, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-800">
                <span className="opacity-50">#</span>
                {tag}
              </span>
            ))
          )}
        </div>

        {isEditing ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            className="w-full h-[60vh] bg-zinc-800/50 text-zinc-100 p-4 rounded-xl border border-zinc-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm leading-relaxed resize-none focus:outline-none"
            placeholder="Write your note here..."
          />
        ) : (
          <div className="prose prose-invert prose-zinc max-w-none">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Footer / Save Action (only if editing) */}
      {isEditing && (
        <div className="p-4 border-t border-zinc-800 bg-zinc-900 sticky bottom-0 flex justify-end">
          <button
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
            disabled={isProcessingTags}
            onClick={async () => {
              await onSave(note.id, text, note.category, tags);
              setIsEditing(false);
            }}
          >
            {isProcessingTags ? "Processing..." : "Save Changes"}
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          onDelete(note.id);
          onBack();
        }}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
      />
    </div>
  );
}
