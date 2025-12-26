import { ReactNode } from 'react';
import { NoteList } from '../components/NoteList';

interface NoteListViewProps {
  title: ReactNode;
  notes: any[];
  offset: number;
  LIMIT: number;
  onResetOffset: () => void;
  onDelete: (id: number) => void;
  onNoteClick: (note: any) => void;
  onCategoryClick: (category: string) => void;
  onTagClick: (tag: string) => void;
  onPin: (note: any) => void;
  onLoadMore: () => void;
  hasMore: boolean;
}

export const NoteListView = ({
  title,
  notes,
  offset,
  LIMIT,
  onResetOffset,
  onDelete,
  onNoteClick,
  onCategoryClick,
  onTagClick,
  onPin,
  onLoadMore,
  hasMore
}: NoteListViewProps) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-xl font-semibold text-zinc-200 flex items-center gap-2">
          {title}
        </h2>
        {offset > 0 && (
          <button
            onClick={onResetOffset}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            Back to Start
          </button>
        )}
      </div>
      <NoteList
        notes={notes}
        onDelete={onDelete}
        onNoteClick={onNoteClick}
        onCategoryClick={onCategoryClick}
        onTagClick={onTagClick}
        onPin={onPin}
        onLoadMore={hasMore ? onLoadMore : undefined}
        hasMore={hasMore}
      />
    </div>
  );
};
