import api from './api';
import { RecognitionLogItem } from '../types';

export const recognitionService = {
  async getMyLogs(limit: number = 50): Promise<RecognitionLogItem[]> {
    const response = await api.get<RecognitionLogItem[]>('/api/recognition/logs', {
      params: { limit },
    });
    return response.data;
  },

  async testSpeech(text?: string, lang: string = 'te'): Promise<{ status: string; spoken: string; lang: string }> {
    const response = await api.post('/api/recognition/speech/test', { text, lang });
    return response.data;
  },
};