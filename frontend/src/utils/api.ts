import axios from 'axios';
import { AuthResponse, Day, DayContent, UserProgress, Notebook, User, UserProfileData, Company, CompanyMember, FreeResource, CoursePackage, CertificateData, CertificateTemplate, EventData, QuizData, QuizSubmitResult, AssignmentData, ContentItemProgressData, CommentData, SearchResult, BadgeData, RecommendationData, SubscriptionPlanData, UserSubscriptionData } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      // Don't redirect if already on a public page
      const publicPaths = ['/login', '/register', '/browse'];
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = '/login';
      }
    }
    if (error.response?.status === 429) {
      error.response.data = { error: 'Too many requests. Please wait a moment and try again.' };
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (username: string, email: string, password: string, inviteCode?: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', {
      username,
      email,
      password,
      invite_code: inviteCode || undefined,
    });
    return response.data;
  },

  login: async (emailOrUsername: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { emailOrUsername, password });
    return response.data;
  },

  googleLogin: async (credential: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/google', { credential });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/reset-password', { token, new_password: newPassword });
    return response.data;
  },

  resendVerification: async (): Promise<{ message: string }> => {
    const response = await api.post('/auth/resend-verification');
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/user/me');
    return response.data;
  },

  submitOnboarding: async (data: Partial<UserProfileData>): Promise<{ success: boolean; user: User }> => {
    const response = await api.post('/user/onboarding', data);
    return response.data;
  },

  updateProfile: async (data: Partial<UserProfileData>): Promise<{ success: boolean; user: User }> => {
    const response = await api.put('/user/profile', data);
    return response.data;
  },
};

export const contentAPI = {
  getDays: async (): Promise<any> => {
    const response = await api.get('/admin/content/days');
    return response.data;
  },

  uploadFile: async (dayNumber: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/admin/content/days/${dayNumber}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteFile: async (dayNumber: number, filename: string): Promise<any> => {
    const response = await api.delete(`/admin/content/days/${dayNumber}/files/${filename}`);
    return response.data;
  },

  updateMetadata: async (dayNumber: number, metadata: any): Promise<any> => {
    const response = await api.put(`/admin/content/days/${dayNumber}/metadata`, metadata);
    return response.data;
  },
};

export const analyticsAPI = {
  get: async (): Promise<any> => {
    const response = await api.get('/admin/analytics');
    return response.data;
  },
};

export const daysAPI = {
  getDays: async (): Promise<Day[]> => {
    const response = await api.get('/days');
    return response.data.days;
  },

  getDayContent: async (dayNumber: number): Promise<DayContent> => {
    const response = await api.get(`/days/${dayNumber}/content`);
    return response.data;
  },

  getNotebook: async (dayNumber: number, filename: string): Promise<Notebook> => {
    const response = await api.get(`/days/${dayNumber}/notebook/${filename}`);
    return response.data;
  },

  getPDF: async (dayNumber: number, filename: string): Promise<string> => {
    const response = await api.get(`/days/${dayNumber}/pdf/${filename}`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },

  executeCell: async (code: string): Promise<any> => {
    const response = await api.post('/execute/cell', { code });
    return response.data;
  },
};

export const progressAPI = {
  getProgress: async (): Promise<UserProgress[]> => {
    const response = await api.get('/progress');
    return response.data.progress;
  },

  updateProgress: async (
    dayNumber: number,
    data: { completed?: boolean; time_spent?: number }
  ): Promise<UserProgress> => {
    const response = await api.post(`/progress/${dayNumber}`, data);
    return response.data;
  },

  getItemProgress: async (dayNumber: number): Promise<ContentItemProgressData[]> => {
    const response = await api.get(`/progress/${dayNumber}/items`);
    return response.data.items;
  },

  updateItemProgress: async (dayNumber: number, data: {
    item_type: string;
    item_identifier: string;
    completed?: boolean;
    progress_pct?: number;
  }): Promise<ContentItemProgressData> => {
    const response = await api.post(`/progress/${dayNumber}/item`, data);
    return response.data;
  },
};

export const quizAPI = {
  getDayQuiz: async (dayNumber: number): Promise<{ quiz: QuizData | null }> => {
    const response = await api.get(`/days/${dayNumber}/quiz`);
    return response.data;
  },

  submitQuiz: async (quizId: number, answers: Record<string, string>): Promise<QuizSubmitResult> => {
    const response = await api.post(`/quizzes/${quizId}/submit`, { answers });
    return response.data;
  },

  // Admin
  listQuizzes: async (): Promise<any> => {
    const response = await api.get('/admin/quizzes');
    return response.data;
  },

  createQuiz: async (data: any): Promise<any> => {
    const response = await api.post('/admin/quizzes', data);
    return response.data;
  },

  updateQuiz: async (id: number, data: any): Promise<any> => {
    const response = await api.put(`/admin/quizzes/${id}`, data);
    return response.data;
  },

  deleteQuiz: async (id: number): Promise<void> => {
    await api.delete(`/admin/quizzes/${id}`);
  },

  getAttempts: async (quizId: number): Promise<any> => {
    const response = await api.get(`/admin/quizzes/${quizId}/attempts`);
    return response.data;
  },
};

export const assignmentAPI = {
  getDayAssignment: async (dayNumber: number): Promise<{ assignment: AssignmentData | null }> => {
    const response = await api.get(`/days/${dayNumber}/assignment`);
    return response.data;
  },

  submitAssignment: async (assignmentId: number, data: { text_content?: string; file?: File }): Promise<any> => {
    const formData = new FormData();
    if (data.text_content) formData.append('text_content', data.text_content);
    if (data.file) formData.append('file', data.file);
    const response = await api.post(`/assignments/${assignmentId}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Admin
  listAssignments: async (): Promise<any> => {
    const response = await api.get('/admin/assignments');
    return response.data;
  },

  createAssignment: async (data: any): Promise<any> => {
    const response = await api.post('/admin/assignments', data);
    return response.data;
  },

  updateAssignment: async (id: number, data: any): Promise<any> => {
    const response = await api.put(`/admin/assignments/${id}`, data);
    return response.data;
  },

  deleteAssignment: async (id: number): Promise<void> => {
    await api.delete(`/admin/assignments/${id}`);
  },

  listSubmissions: async (): Promise<any> => {
    const response = await api.get('/admin/submissions');
    return response.data;
  },

  reviewSubmission: async (id: number, data: { grade: string; feedback: string }): Promise<any> => {
    const response = await api.put(`/admin/submissions/${id}/review`, data);
    return response.data;
  },
};

export const commentsAPI = {
  getComments: async (dayNumber: number): Promise<CommentData[]> => {
    const response = await api.get(`/days/${dayNumber}/comments`);
    return response.data.comments;
  },

  createComment: async (dayNumber: number, content: string, parentId?: number): Promise<CommentData> => {
    const response = await api.post(`/days/${dayNumber}/comments`, { content, parent_id: parentId });
    return response.data;
  },

  updateComment: async (commentId: number, content: string): Promise<CommentData> => {
    const response = await api.put(`/comments/${commentId}`, { content });
    return response.data;
  },

  deleteComment: async (commentId: number): Promise<void> => {
    await api.delete(`/comments/${commentId}`);
  },
};

export const searchAPI = {
  search: async (query: string): Promise<SearchResult> => {
    const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
};

export const recommendationsAPI = {
  get: async (): Promise<{ recommendations: RecommendationData[] }> => {
    const response = await api.get('/recommendations');
    return response.data;
  },
};

export const badgesAPI = {
  getMyBadges: async (): Promise<{ badges: BadgeData[]; new_badges: any[] }> => {
    const response = await api.get('/badges/my');
    return response.data;
  },

  // Admin
  listBadges: async (): Promise<any> => {
    const response = await api.get('/admin/badges');
    return response.data;
  },

  createBadge: async (data: any): Promise<any> => {
    const response = await api.post('/admin/badges', data);
    return response.data;
  },

  updateBadge: async (id: number, data: any): Promise<any> => {
    const response = await api.put(`/admin/badges/${id}`, data);
    return response.data;
  },

  deleteBadge: async (id: number): Promise<void> => {
    await api.delete(`/admin/badges/${id}`);
  },
};

export const paymentsAPI = {
  getPlans: async (): Promise<{ plans: SubscriptionPlanData[] }> => {
    const response = await api.get('/public/plans');
    return response.data;
  },

  createCheckout: async (planId: number): Promise<{ checkout_url: string; session_id: string }> => {
    const response = await api.post('/payments/create-checkout', { plan_id: planId });
    return response.data;
  },

  getMySubscriptions: async (): Promise<{ subscriptions: UserSubscriptionData[] }> => {
    const response = await api.get('/payments/my-subscriptions');
    return response.data;
  },

  cancelSubscription: async (subscriptionId: number): Promise<any> => {
    const response = await api.post('/payments/cancel', { subscription_id: subscriptionId });
    return response.data;
  },

  // Admin
  listPlans: async (): Promise<any> => {
    const response = await api.get('/admin/subscription-plans');
    return response.data;
  },

  createPlan: async (data: any): Promise<any> => {
    const response = await api.post('/admin/subscription-plans', data);
    return response.data;
  },

  updatePlan: async (id: number, data: any): Promise<any> => {
    const response = await api.put(`/admin/subscription-plans/${id}`, data);
    return response.data;
  },

  deletePlan: async (id: number): Promise<void> => {
    await api.delete(`/admin/subscription-plans/${id}`);
  },
};

export const companiesAPI = {
  getCompanies: async (): Promise<Company[]> => {
    const response = await api.get('/admin/companies');
    return response.data.companies;
  },

  createCompany: async (data: {
    name: string;
    invite_code: string;
    email_domains?: string[];
    accessible_days?: number[];
  }): Promise<Company> => {
    const response = await api.post('/admin/companies', data);
    return response.data;
  },

  updateCompany: async (companyId: number, data: {
    name?: string;
    invite_code?: string;
    email_domains?: string[];
    is_active?: boolean;
    is_public?: boolean;
  }): Promise<Company> => {
    const response = await api.put(`/admin/companies/${companyId}`, data);
    return response.data;
  },

  deleteCompany: async (companyId: number): Promise<void> => {
    await api.delete(`/admin/companies/${companyId}`);
  },

  setDayAccess: async (companyId: number, dayNumbers: number[]): Promise<Company> => {
    const response = await api.put(`/admin/companies/${companyId}/access`, { day_numbers: dayNumbers });
    return response.data;
  },

  getMembers: async (companyId: number): Promise<CompanyMember[]> => {
    const response = await api.get(`/admin/companies/${companyId}/members`);
    return response.data.members;
  },

  addMember: async (companyId: number, userId: number): Promise<void> => {
    await api.post(`/admin/companies/${companyId}/members`, { user_id: userId });
  },

  removeMember: async (companyId: number, userId: number): Promise<void> => {
    await api.delete(`/admin/companies/${companyId}/members/${userId}`);
  },

  setPackages: async (companyId: number, packageIds: number[]): Promise<Company> => {
    const response = await api.put(`/admin/companies/${companyId}/packages`, { package_ids: packageIds });
    return response.data;
  },
};

export const enrollmentAPI = {
  getResource: async (resourceId: number): Promise<{ resource: FreeResource; enrollment: any }> => {
    const response = await api.get(`/free-resources/${resourceId}`);
    return response.data;
  },
  getMyEnrollments: async (): Promise<any[]> => {
    const response = await api.get('/free-resources/my-enrollments');
    return response.data.enrollments;
  },
  markComplete: async (resourceId: number): Promise<any> => {
    const response = await api.post(`/free-resources/${resourceId}/complete`);
    return response.data;
  },
};

export const publicAPI = {
  getDays: async (): Promise<Day[]> => {
    const response = await api.get('/public/days');
    return response.data.days;
  },
  getFreeResources: async (): Promise<FreeResource[]> => {
    const response = await api.get('/public/free-resources');
    return response.data.resources;
  },
  getEvents: async (): Promise<EventData[]> => {
    const response = await api.get('/public/events');
    return response.data.events;
  },
};

export const freeResourcesAPI = {
  getAll: async (): Promise<FreeResource[]> => {
    const response = await api.get('/admin/free-resources');
    return response.data.resources;
  },
  create: async (data: Partial<FreeResource>): Promise<FreeResource> => {
    const response = await api.post('/admin/free-resources', data);
    return response.data;
  },
  update: async (id: number, data: Partial<FreeResource>): Promise<FreeResource> => {
    const response = await api.put(`/admin/free-resources/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/free-resources/${id}`);
  },
};

export const packagesAPI = {
  getAll: async (): Promise<CoursePackage[]> => {
    const response = await api.get('/admin/packages');
    return response.data.packages;
  },
  create: async (data: { name: string; description?: string; days?: number[] }): Promise<CoursePackage> => {
    const response = await api.post('/admin/packages', data);
    return response.data;
  },
  update: async (id: number, data: Partial<CoursePackage & { days: number[] }>): Promise<CoursePackage> => {
    const response = await api.put(`/admin/packages/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/packages/${id}`);
  },
};

export const certificatesAPI = {
  getMy: async (): Promise<CertificateData[]> => {
    const response = await api.get('/certificates/my');
    return response.data.certificates;
  },
  check: async (): Promise<{ newly_issued: CertificateData[]; count: number }> => {
    const response = await api.post('/certificates/check');
    return response.data;
  },
  getDownloadUrl: (certId: string): string => `${API_URL}/certificates/${certId}/download`,
  verify: async (certId: string): Promise<any> => {
    const response = await api.get(`/verify/${certId}`);
    return response.data;
  },
};

export const certTemplatesAPI = {
  getAll: async (): Promise<CertificateTemplate[]> => {
    const response = await api.get('/admin/certificate-templates');
    return response.data.templates;
  },
  create: async (data: Partial<CertificateTemplate>): Promise<CertificateTemplate> => {
    const response = await api.post('/admin/certificate-templates', data);
    return response.data;
  },
  update: async (id: number, data: Partial<CertificateTemplate>): Promise<CertificateTemplate> => {
    const response = await api.put(`/admin/certificate-templates/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/certificate-templates/${id}`);
  },
  getAllCertificates: async (): Promise<CertificateData[]> => {
    const response = await api.get('/admin/certificates');
    return response.data.certificates;
  },
};

export const eventsAPI = {
  getAll: async (): Promise<EventData[]> => {
    const response = await api.get('/admin/events');
    return response.data.events;
  },
  create: async (data: Partial<EventData>): Promise<EventData> => {
    const response = await api.post('/admin/events', data);
    return response.data;
  },
  update: async (id: number, data: Partial<EventData>): Promise<EventData> => {
    const response = await api.put(`/admin/events/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/admin/events/${id}`);
  },
};

export default api;
