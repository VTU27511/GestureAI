import api from './api';
import { AuthResponse, LoginInput, RegisterInput, User } from '../types';

export const authService = {
  async register(data: RegisterInput): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/register', data);
    return response.data;
  },

  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/login', data);
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await api.get<User>('/api/users/me');
    return response.data;
  },

  logout(): void {
    localStorage.removeItem('gestureai_token');
    localStorage.removeItem('gestureai_user');
  },
};
