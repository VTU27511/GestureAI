import numpy as np

class LandmarkNormalizer:
    """
    Normalizes 3D hand landmark coordinates relative to wrist reference point
    and scales by maximum hand span for translation and distance invariance.
    """

    @classmethod
    def _normalize_single_hand(cls, hand_vector: np.ndarray) -> np.ndarray:
        """
        Normalize 63-element vector (21 landmarks x 3 coords).
        """
        if len(hand_vector) != 63:
            return hand_vector

        # Reshape to (21, 3)
        coords = hand_vector.reshape(21, 3).copy()

        # If hand is all zeros (missing hand), return zeros
        if np.all(coords == 0):
            return hand_vector

        # Wrist is index 0
        wrist = coords[0].copy()

        # 1. Translation Invariance: Shift all landmarks relative to wrist
        rel_coords = coords - wrist

        # 2. Scale Invariance: Divide by maximum Euclidean distance from wrist
        distances = np.linalg.norm(rel_coords, axis=1)
        max_dist = np.max(distances)

        if max_dist > 1e-6:
            normalized = rel_coords / max_dist
        else:
            normalized = rel_coords

        return normalized.flatten().astype(np.float32)

    @classmethod
    def normalize(cls, raw_vector: np.ndarray) -> np.ndarray:
        """
        Normalize fixed-size vector (63 for single hand, 126 for two hands).
        """
        if raw_vector is None or len(raw_vector) == 0:
            return np.zeros(63, dtype=np.float32)

        if len(raw_vector) == 63:
            return cls._normalize_single_hand(raw_vector)

        elif len(raw_vector) == 126:
            left = cls._normalize_single_hand(raw_vector[:63])
            right = cls._normalize_single_hand(raw_vector[63:])
            return np.concatenate([left, right]).astype(np.float32)

        return raw_vector.astype(np.float32)