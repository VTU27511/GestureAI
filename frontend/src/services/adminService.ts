import api from './api';
import {
  AdminStats,
  AdminUserListItem,
  AdminGestureListItem,
  AdminTrainingListItem,
  AdminModelListItem,
  RecognitionLogItem,
  User,
  UserRole
} from '../types';

export interface UserStatusUpdateInput {
  is_active?: boolean;
  role?: UserRole;
}

export interface AdminUserDetailResponse {
  user: User;
  gestures: Array<{
    id: number;
    name: string;
    meaning: string;
    speech_text: string;
    gesture_type: string;
    object_name: string | null;
    sample_count: number;
    status: string;
    accuracy: number | null;
    model_version: string | null;
    created_at: string;
    last_trained: string | null;
  }>;
  models: Array<{
    id: number;
    model_type: string;
    version: string;
    accuracy: number | null;
    sample_count: number;
    is_active: boolean;
    created_at: string;
  }>;
}

export const adminService = {
  async getUsers(): Promise<AdminUserListItem[]> {
    const response = await api.get<AdminUserListItem[]>('/api/admin/users');
    return response.data;
  },

  async getUserDetail(id: number | string): Promise<AdminUserDetailResponse> {
    const response = await api.get<AdminUserDetailResponse>(`/api/admin/users/${id}`);
    return response.data;
  },

  async updateUserStatus(id: number | string, data: UserStatusUpdateInput): Promise<User> {
    const response = await api.put<User>(`/api/admin/users/${id}/status`, data);
    return response.data;
  },

  async getStats(): Promise<AdminStats> {
    const response = await api.get<AdminStats>('/api/admin/stats');
    return response.data;
  },

  async getGestures(): Promise<AdminGestureListItem[]> {
    const response = await api.get<AdminGestureListItem[]>('/api/admin/gestures');
    return response.data;
  },

  async getTrainingSessions(): Promise<AdminTrainingListItem[]> {
    const response = await api.get<AdminTrainingListItem[]>('/api/admin/training');
    return response.data;
  },

  async getModels(): Promise<AdminModelListItem[]> {
    const response = await api.get<AdminModelListItem[]>('/api/admin/models');
    return response.data;
  },

  async getRecognitionLogs(params?: { user_id?: number; gesture_id?: number; limit?: number }): Promise<RecognitionLogItem[]> {
    const response = await api.get<RecognitionLogItem[]>('/api/admin/logs', { params });
    return response.data;
  },
};