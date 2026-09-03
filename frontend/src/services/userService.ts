import api from './api';
import { User, UserStats, UserProfileUpdate } from '../types';

export const userService = {
  async getMyStats(): Promise<UserStats> {
    const response = await api.get<UserStats>('/api/users/stats');
    return response.data;
  },

  async updateProfile(data: UserProfileUpdate): Promise<User> {
    const response = await api.put<User>('/api/users/me', data);
    return response.data;
  },
};
