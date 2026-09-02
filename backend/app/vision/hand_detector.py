from typing import List, Optional, Tuple, Dict, Any
import cv2
import mediapipe as mp
import numpy as np

class HandDetector:
    """
    MediaPipe Hands wrapper for single and bimanual hand landmark detection.
    """
    def __init__(
        self,
        static_image_mode: bool = False,
        max_num_hands: int = 2,
        min_detection_confidence: float = 0.6,
        min_tracking_confidence: float = 0.5
    ):
        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        self.hands = self.mp_hands.Hands(
            static_image_mode=static_image_mode,
            max_num_hands=max_num_hands,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence
        )

    def process(self, frame: np.ndarray) -> Tuple[Any, int, List[str]]:
        """
        Process BGR frame and return:
        - results (MediaPipe Hands results object)
        - hand_count (number of detected hands)
        - handedness_labels (list of 'Left' or 'Right' labels)
        """
        if frame is None or frame.size == 0:
            return None, 0, []

        # Convert BGR to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb_frame.flags.writeable = False
        results = self.hands.process(rgb_frame)
        rgb_frame.flags.writeable = True

        hand_count = 0
        handedness_labels = []

        if results.multi_hand_landmarks:
            hand_count = len(results.multi_hand_landmarks)
            if results.multi_handedness:
                for handedness in results.multi_handedness:
                    label = handedness.classification[0].label
                    handedness_labels.append(label)

        return results, hand_count, handedness_labels

    def draw_landmarks(self, frame: np.ndarray, results: Any) -> np.ndarray:
        """
        Draw hand skeleton and landmarks onto frame.
        """
        annotated_frame = frame.copy()
        if results and results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                self.mp_drawing.draw_landmarks(
                    annotated_frame,
                    hand_landmarks,
                    self.mp_hands.HAND_CONNECTIONS,
                    self.mp_drawing_styles.get_default_hand_landmarks_style(),
                    self.mp_drawing_styles.get_default_hand_connections_style()
                )
        return annotated_frame

    def close(self):
        try:
            self.hands.close()
        except Exception:
            pass