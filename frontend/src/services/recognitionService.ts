import api from './api';
import { RecognitionLogItem } from '../types';

export const recognitionService = {
  async getMyLogs(limit: number = 50): Promise<RecognitionLogItem[]> {
    const response = await api.get<RecognitionLogItem[]>('/api/recognition/logs', {
      params: { limit },
    });
    return response.data;
  },
};