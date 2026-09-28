import api from './api';
import { RecognitionLogItem } from '../types';

export const recognitionService = {
  async getMyLogs(limit: number = 50): Promise<RecognitionLogItem[]> {
    const response = await api.get<RecognitionLogItem[]>('/api/recognition/logs', {
      params: { limit },
    });
    return response.data;
  },

  async testSpeech(
    text?: string,
    lang: string = 'te',
    gender: 'female' | 'male' = 'female'
  ): Promise<{ status: string; spoken: string; lang: string; gender?: string; audio_base64?: string }> {
    const response = await api.post<{ status: string; spoken: string; lang: string; gender?: string; audio_base64?: string }>(
      '/api/recognition/speech/test',
      { text, lang, gender }
    );
    return response.data;
  },

  getAudioStreamUrl(text: string, lang: string = 'te', gender: 'female' | 'male' = 'female'): string {
    const encoded = encodeURIComponent(text);
    return `/api/recognition/speech/stream?text=${encoded}&lang=${lang}&gender=${gender}`;
  },
};