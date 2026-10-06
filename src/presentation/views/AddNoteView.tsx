import { AddNoteForm } from '../components/AddNoteForm';

interface AddNoteViewProps {
  onAdd: (text: string, category: string, tags: string[]) => Promise<boolean>;
  categories: Array<{ id: number; name: string }>;
  isProcessing: boolean;
}

export const AddNoteView = ({ onAdd, categories, isProcessing }: AddNoteViewProps) => {
  return <AddNoteForm onAdd={onAdd} categories={categories} isProcessing={isProcessing} />;
};
