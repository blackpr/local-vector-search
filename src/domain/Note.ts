export interface Note {
  id: number;
  uuid: string;
  text: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NewNote = Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { uuid?: string };
