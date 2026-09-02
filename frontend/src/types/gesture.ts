export type GestureType = 'ONE_HAND' | 'TWO_HANDS' | 'HAND_OBJECT';

export interface Gesture {
  id: number;
  user_id: number;
  name: string;
  meaning: string;
  speech_text: string;
  gesture_type: GestureType;
  object_name: string | null;
  created_at: string;
  updated_at: string;
  samples_count: number;
  status: string;
}

export interface GestureCreateInput {
  name: string;
  meaning: string;
  speech_text: string;
  gesture_type: GestureType;
  object_name?: string | null;
}

export interface GestureUpdateInput {
  name?: string;
  meaning?: string;
  speech_text?: string;
  gesture_type?: GestureType;
  object_name?: string | null;
}
