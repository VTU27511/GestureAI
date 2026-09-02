import api from './api';
import { Gesture, GestureCreateInput, GestureUpdateInput } from '../types';

export interface TrainModelResult {
  model_id: number;
  version: string;
  accuracy: number;
  sample_count: number;
  model_type: string;
  classes: string[];
}

export interface ActiveModelInfo {
  has_active_model: boolean;
  model_id?: number;
  version?: string;
  accuracy?: number | null;
  sample_count?: number;
  model_type?: string;
  created_at?: string;
}

export const gestureService = {
  async getGestures(): Promise<Gesture[]> {
    const response = await api.get<Gesture[]>('/api/gestures');
    return response.data;
  },

  async getGesture(id: number | string): Promise<Gesture> {
    const response = await api.get<Gesture>(`/api/gestures/${id}`);
    return response.data;
  },

  async createGesture(data: GestureCreateInput): Promise<Gesture> {
    const response = await api.post<Gesture>('/api/gestures', data);
    return response.data;
  },

  async updateGesture(id: number | string, data: GestureUpdateInput): Promise<Gesture> {
    const response = await api.put<Gesture>(`/api/gestures/${id}`, data);
    return response.data;
  },

  async deleteGesture(id: number | string): Promise<void> {
    await api.delete(`/api/gestures/${id}`);
  },

  async trainModel(): Promise<TrainModelResult> {
    const response = await api.post<TrainModelResult>('/api/gestures/train');
    return response.data;
  },

  async getActiveModel(): Promise<ActiveModelInfo> {
    const response = await api.get<ActiveModelInfo>('/api/gestures/model/active');
    return response.data;
  },

  async clearSamples(gestureId: number | string): Promise<void> {
    await api.delete(`/api/gestures/${gestureId}/samples`);
  },
};