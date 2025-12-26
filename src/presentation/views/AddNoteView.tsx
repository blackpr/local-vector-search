import { AddNoteForm } from '../components/AddNoteForm';

interface AddNoteViewProps {
  onAdd: (text: string, category: string, tags: string[]) => void;
  categories: string[];
  isProcessing: boolean;
  onAutoCategory: (text: string) => Promise<string>;
  onAutoTags: (text: string) => Promise<string[]>;
}

export const AddNoteView = ({
  onAdd,
  categories,
  isProcessing,
  onAutoCategory,
  onAutoTags
}: AddNoteViewProps) => {
  return (
    <AddNoteForm
      onAdd={onAdd}
      categories={categories}
      isProcessing={isProcessing}
      onAutoCategory={onAutoCategory}
      onAutoTags={onAutoTags}
    />
  );
};
