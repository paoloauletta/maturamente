export interface Note {
  id: string;
  title: string;
  pdf_url: string;
  subject_id: string;
  created_at: Date;
  slug: string;
  is_favorite?: boolean;
}

export interface FavoriteNote {
  id: string;
  user_id: string;
  note_id: string;
  created_at: Date;
  note: Note;
}

export interface SubjectInfo {
  id: string;
  name: string;
  color: string;
  slug: string;
}

export interface SubjectNotesData {
  allNotes: Note[];
  favoriteNotes: Note[];
  subject: SubjectInfo;
}
