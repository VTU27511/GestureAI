from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from app.models.gesture import GestureType

class LandmarkExtractor:
    """
    Extracts raw 21 3D coordinates (x, y, z) per hand and generates
    fixed-size feature vectors with deterministic hand ordering.
    """
    HAND_LANDMARKS_COUNT = 21
    COORDS_PER_LANDMARK = 3
    ONE_HAND_FEATURES = HAND_LANDMARKS_COUNT * COORDS_PER_LANDMARK  # 63
    TWO_HANDS_FEATURES = ONE_HAND_FEATURES * 2                      # 126

    @classmethod
    def extract_raw_landmarks(cls, results: Any) -> List[List[Dict[str, float]]]:
        """
        Extract raw JSON-serializable landmark lists for database storage.
        """
        hands_data = []
        if not results or not results.multi_hand_landmarks:
            return hands_data

        for hand_landmarks in results.multi_hand_landmarks:
            landmarks_list = []
            for lm in hand_landmarks.landmark:
                landmarks_list.append({
                    "x": float(lm.x),
                    "y": float(lm.y),
                    "z": float(lm.z)
                })
            hands_data.append(landmarks_list)
        return hands_data

    @classmethod
    def extract_vector(
        cls,
        results: Any,
        gesture_type: GestureType = GestureType.ONE_HAND
    ) -> Tuple[np.ndarray, bool]:
        """
        Generates fixed-size 63 (ONE_HAND / HAND_OBJECT) or 126 (TWO_HANDS) vector.
        Returns (feature_vector, is_valid_detection).
        """
        is_two_hands = (gesture_type == GestureType.TWO_HANDS)
        target_size = cls.TWO_HANDS_FEATURES if is_two_hands else cls.ONE_HAND_FEATURES

        if not results or not results.multi_hand_landmarks:
            return np.zeros(target_size, dtype=np.float32), False

        hands = results.multi_hand_landmarks
        handedness_list = []
        if results.multi_handedness:
            for h in results.multi_handedness:
                handedness_list.append(h.classification[0].label)
        else:
            handedness_list = ["Left" if i == 0 else "Right" for i in range(len(hands))]

        if not is_two_hands:
            # ONE_HAND or HAND_OBJECT: 63 features
            # Use primary (first) detected hand
            primary_hand = hands[0]
            vector = []
            for lm in primary_hand.landmark:
                vector.extend([lm.x, lm.y, lm.z])
            return np.array(vector, dtype=np.float32), True

        else:
            # TWO_HANDS: 126 features
            # Left Hand = indices 0..62, Right Hand = indices 63..125
            left_vector = np.zeros(cls.ONE_HAND_FEATURES, dtype=np.float32)
            right_vector = np.zeros(cls.ONE_HAND_FEATURES, dtype=np.float32)

            has_left = False
            has_right = False

            for hand_idx, hand_lms in enumerate(hands):
                label = handedness_list[hand_idx] if hand_idx < len(handedness_list) else "Unknown"
                hand_coords = []
                for lm in hand_lms.landmark:
                    hand_coords.extend([lm.x, lm.y, lm.z])
                arr = np.array(hand_coords, dtype=np.float32)

                if label == "Left" and not has_left:
                    left_vector = arr
                    has_left = True
                elif label == "Right" and not has_right:
                    right_vector = arr
                    has_right = True
                elif not has_left:
                    left_vector = arr
                    has_left = True
                elif not has_right:
                    right_vector = arr
                    has_right = True

            combined = np.concatenate([left_vector, right_vector])
            # For TWO_HANDS, valid requires both hands detected
            is_valid = (len(hands) >= 2 and has_left and has_right)
            return combined, is_valid