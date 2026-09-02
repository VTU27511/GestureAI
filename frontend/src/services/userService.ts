import api from './api';
import { UserStats } from '../types';

export const userService = {
  async getMyStats(): Promise<UserStats> {
    const response = await api.get<UserStats>('/api/users/stats');
    return response.data;
  },
};
