export interface Note {
  id: number;
  uuid: string;
  text: string;
  category: string;
  tags?: string[];
  isPinned?: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export type NewNote = Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { uuid?: string };
