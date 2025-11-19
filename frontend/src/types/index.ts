export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  last_login: string | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface Day {
  day_number: number;
  title: string;
  description: string;
  notebooks: number;
  pdfs: number;
  total_resources: number;
}

export interface DayContent {
  day_number: number;
  title: string;
  description: string;
  notebooks: ContentFile[];
  pdfs: ContentFile[];
}

export interface ContentFile {
  filename: string;
  name: string;
  type: 'notebook' | 'pdf';
}

export interface UserProgress {
  id: number;
  user_id: number;
  day_number: number;
  completed: boolean;
  last_accessed: string;
  time_spent: number;
}

export interface NotebookCell {
  cell_type: 'code' | 'markdown' | 'raw';
  source: string | string[];
  metadata?: any;
  outputs?: any[];
  execution_count?: number | null;
}

export interface Notebook {
  cells: NotebookCell[];
  metadata: any;
  nbformat: number;
  nbformat_minor: number;
}
