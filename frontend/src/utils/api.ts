import axios from 'axios';
import { AuthResponse, Day, DayContent, UserProgress, Notebook, User } from '../types';

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
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (username: string, email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },

  login: async (emailOrUsername: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { emailOrUsername, password });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/user/me');
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
};

export default api;
