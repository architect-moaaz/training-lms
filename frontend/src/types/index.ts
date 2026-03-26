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
  email_verified: boolean;
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

export interface EventData {
  id: number;
  title: string;
  description: string;
  event_date: string;
  location: string;
  city: string;
  attendees: string;
  image_url: string | null;
  linkedin_url: string | null;
  highlights: string;
  event_type: string;
  is_upcoming: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface CertificateTemplate {
  id: number;
  name: string;
  description: string;
  trigger_type: string;
  trigger_value: string;
  is_active: boolean;
  issued_count: number;
  created_at: string;
}

export interface CertificateData {
  id: number;
  cert_id: string;
  user_id: number;
  template_id: number;
  user_name: string;
  certificate_title: string;
  issued_at: string;
}

export interface QuizData {
  id: number;
  day_number: number;
  title: string;
  description: string;
  passing_score: number;
  time_limit_minutes: number | null;
  question_count: number;
  total_points: number;
  questions: QuizQuestionData[];
  best_attempt: QuizAttemptData | null;
}

export interface QuizQuestionData {
  id: number;
  quiz_id: number;
  question_text: string;
  question_type: string;
  options: string[];
  points: number;
  sort_order: number;
  correct_answer?: string;
}

export interface QuizAttemptData {
  id: number;
  user_id: number;
  quiz_id: number;
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  answers: Record<string, string>;
  completed_at: string;
}

export interface QuizSubmitResult {
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  results: { question_id: number; correct: boolean; correct_answer: string; your_answer: string }[];
  attempt: QuizAttemptData;
}

export interface AssignmentData {
  id: number;
  day_number: number;
  title: string;
  description: string;
  submission_type: string;
  max_file_size_mb: number;
  is_active: boolean;
  submission_count: number;
  my_submission: SubmissionData | null;
  created_at: string;
}

export interface SubmissionData {
  id: number;
  user_id: number;
  assignment_id: number;
  text_content: string;
  file_name: string | null;
  status: string;
  grade: string | null;
  feedback: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface ContentItemProgressData {
  id: number;
  user_id: number;
  day_number: number;
  item_type: string;
  item_identifier: string;
  completed: boolean;
  progress_pct: number;
  last_accessed: string;
}

export interface SubscriptionPlanData {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  price_display: string;
  currency: string;
  billing_period: string;
  stripe_price_id: string;
  package_id: number | null;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface UserSubscriptionData {
  id: number;
  user_id: number;
  plan_id: number;
  plan_name: string;
  status: string;
  stripe_subscription_id: string;
  current_period_end: string | null;
  created_at: string;
}

export interface BadgeData {
  id: number;
  user_id: number;
  badge_id: number;
  badge_name: string;
  badge_description: string;
  badge_icon: string;
  earned_at: string;
}

export interface BadgeDefinitionData {
  id: number;
  name: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  is_active: boolean;
  earned_count: number;
  created_at: string;
}

export interface RecommendationData {
  day_number?: number;
  id?: number;
  title: string;
  description: string;
  level?: string;
  reason: string;
  type?: string;
}

export interface CommentData {
  id: number;
  user_id: number;
  username: string;
  day_number: number;
  parent_id: number | null;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  days: { day_number: number; title: string; description: string; type: string }[];
  resources: { id: number; title: string; description: string; instructor: string; type: string }[];
  total: number;
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
