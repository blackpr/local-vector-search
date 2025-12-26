export interface Note {
  id: number;
  text: string;
  category: string;
  createdAt: Date;
}

export type NewNote = Omit<Note, 'id' | 'createdAt'>;
