export interface CompanyMembership {
  id: number;
  name: string;
  joined_via: string;
}

export interface Company {
  id: number;
  name: string;
  slug: string;
  invite_code: string;
  email_domains: string[];
  is_active: boolean;
  is_public: boolean;
  member_count: number;
  accessible_days: number[];
  packages?: number[];
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  user_id: number;
  username: string;
  email: string;
  joined_at: string;
  joined_via: string;
}

export interface UserProfileData {
  full_name: string;
  phone: string;
  organization: string;
  job_title: string;
  country: string;
  city: string;
  experience_level: string;
  how_did_you_hear: string;
  learning_goals: string;
  interests: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  onboarding_completed: boolean;
  created_at: string;
  last_login: string | null;
  companies?: CompanyMembership[];
  profile?: UserProfileData;
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
  videos: number;
  total_resources: number;
  level?: string;
}

export interface VideoContent {
  title: string;
  url: string;
  duration: string;
  instructor?: string;
}

export interface DayContent {
  day_number: number;
  title: string;
  description: string;
  level?: string;
  notebooks: ContentFile[];
  pdfs: ContentFile[];
  videos: VideoContent[];
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

export interface FreeResource {
  id: number;
  title: string;
  description: string;
  url: string;
  duration: string;
  instructor: string;
  level: string;
  category: string;
  thumbnail_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CoursePackage {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  days: number[];
  company_count: number;
  created_at: string;
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
