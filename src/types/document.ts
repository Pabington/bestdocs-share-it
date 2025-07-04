
export interface DocumentItem {
  id: string;
  name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  visibility: 'public' | 'private';
  created_at: string;
  user_id: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

export type DocumentFilter = 'all' | 'my_private' | 'public' | 'shared' | 'admin_all';
