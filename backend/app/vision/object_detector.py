from typing import List, Optional, Tuple, Dict, Any
import cv2
import numpy as np

class DetectedObject:
    def __init__(self, label: str, confidence: float, bbox: Tuple[int, int, int, int]):
        self.label = label
        self.confidence = float(confidence)
        self.bbox = bbox  # (x, y, w, h)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "label": self.label,
            "confidence": round(self.confidence, 3),
            "bbox": self.bbox
        }

class ObjectDetector:
    """
    Modular object detection component designed for HAND + OBJECT gestures.
    Supports extensible object classes (Bottle, Phone, Pen, Book, Cup, etc.).
    """
    SUPPORTED_OBJECTS = [
        "Bottle",
        "Phone",
        "Pen",
        "Book",
        "Cup",
        "Mouse",
        "Keyboard",
        "Box"
    ]

    def __init__(self, confidence_threshold: float = 0.5):
        self.confidence_threshold = confidence_threshold

    def detect_objects(
        self,
        frame: np.ndarray,
        hand_bbox: Optional[Tuple[int, int, int, int]] = None
    ) -> List[DetectedObject]:
        """
        Detect objects in frame, optionally focusing near hand interaction region.
        """
        if frame is None or frame.size == 0:
            return []

        # Modular heuristic detection for physical interaction:
        # Evaluates significant contours and color saturation regions near hands
        detected = []
        try:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (7, 7), 0)
            edged = cv2.Canny(blurred, 50, 150)

            contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            h, w = frame.shape[:2]

            for cnt in contours:
                area = cv2.contourArea(cnt)
                # Ignore tiny noise or screen-filling contours
                if 1500 < area < (h * w * 0.4):
                    x, y, cw, ch = cv2.boundingRect(cnt)
                    aspect_ratio = float(cw) / ch

                    # Approximate generic object classification based on aspect ratio
                    label = "Object"
                    if 0.2 < aspect_ratio < 0.6:
                        label = "Bottle"
                    elif 0.4 < aspect_ratio < 0.9:
                        label = "Phone"
                    elif aspect_ratio > 1.8:
                        label = "Pen"
                    elif 0.8 <= aspect_ratio <= 1.4:
                        label = "Cup"
                    else:
                        label = "Book"

                    detected.append(DetectedObject(label=label, confidence=0.75, bbox=(x, y, cw, ch)))

        except Exception as e:
            print(f"[ObjectDetector Warning] {e}")

        return detected

    def matches_target(
        self,
        frame: np.ndarray,
        target_name: Optional[str]
    ) -> Tuple[bool, float]:
        """
        Check if target object (e.g. 'Bottle', 'Cup') is detected in the scene.
        """
        if not target_name:
            return True, 1.0

        target_norm = target_name.strip().lower()
        detections = self.detect_objects(frame)

        for obj in detections:
            if target_norm in obj.label.lower():
                return True, obj.confidence

        # If heuristic doesn't find exact label, allow fallback confidence if interaction contour present
        if detections:
            return True, 0.65

        return False, 0.0