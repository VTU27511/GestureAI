export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface UserStats {
  total_gestures: number;
  total_samples: number;
  trained_models: number;
  recognition_sessions: number;
}
