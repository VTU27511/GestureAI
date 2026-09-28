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
    lang: string = 'te'
  ): Promise<{ status: string; spoken: string; lang: string; audio_base64?: string }> {
    const response = await api.post<{ status: string; spoken: string; lang: string; audio_base64?: string }>(
      '/api/recognition/speech/test',
      { text, lang }
    );
    return response.data;
  },

  getAudioStreamUrl(text: string, lang: string = 'te'): string {
    const encoded = encodeURIComponent(text);
    return `/api/recognition/speech/stream?text=${encoded}&lang=${lang}`;
  },
};