export interface Subject {
  id: string;
  name: string;
  description: string;
  order_index: number;
  color: string;
  maturita: boolean;
  slug: string;
  created_at: Date;
  notes_count: number;
}

export interface UserSubject extends Subject {
  user_relation_created_at: Date;
}
