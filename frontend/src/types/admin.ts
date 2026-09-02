import { UserRole } from './user';
import { GestureType } from './gesture';

export interface AdminUserListItem {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  gesture_count: number;
  session_count: number;
  model_count: number;
  total_samples: number;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_gestures: number;
  total_samples: number;
  total_models: number;
  total_sessions: number;
  total_recognitions: number;
}

export interface AdminGestureListItem {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  name: string;
  meaning: string;
  speech_text: string;
  gesture_type: GestureType;
  object_name: string | null;
  samples_count: number;
  status: string;
  created_at: string;
  accuracy: number | null;
  model_version: string | null;
}

export interface AdminTrainingListItem {
  id: number;
  user_id: number;
  user_name: string;
  gesture_id: number;
  gesture_name: string;
  sample_count: number;
  valid_samples: number;
  invalid_samples: number;
  model_type: string;
  accuracy: number | null;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export interface AdminModelListItem {
  id: number;
  user_id: number;
  user_name: string;
  gesture_id: number | null;
  gesture_name: string | null;
  model_type: string;
  version: string;
  accuracy: number | null;
  sample_count: number;
  is_active: boolean;
  created_at: string;
}

export interface RecognitionLogItem {
  id: number;
  user_id: number;
  user_name: string;
  gesture_id: number;
  gesture_name: string;
  confidence: number;
  recognized_at: string;
}