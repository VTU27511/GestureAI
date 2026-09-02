import os
import joblib
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from fastapi import HTTPException, status

from app.models.gesture import Gesture
from app.models.training_sample import TrainingSample
from app.models.model import MLModel
from app.vision.normalizer import LandmarkNormalizer

class MLService:
    """
    ML training, evaluation, versioning, storage, and inference service
    with strict user data isolation.
    """
    _model_cache: Dict[int, Any] = {}

    @classmethod
    def get_models_dir(cls, user_id: int, gesture_id: Optional[int] = None) -> Path:
        base_dir = Path(__file__).resolve().parent.parent.parent.parent / "trained_models"
        user_dir = base_dir / f"user_{user_id}"
        if gesture_id is not None:
            path = user_dir / f"gesture_{gesture_id}"
        else:
            path = user_dir
        path.mkdir(parents=True, exist_ok=True)
        return path

    @classmethod
    def train_user_model(
        cls,
        db: Session,
        user_id: int,
        model_type: str = "RANDOM_FOREST"
    ) -> Dict[str, Any]:
        """
        Loads training samples for current user, trains a classifier,
        evaluates accuracy, versions and persists the model.
        """
        # 1. Fetch user's gestures
        gestures = db.query(Gesture).filter(Gesture.user_id == user_id).all()
        if not gestures:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User has no gestures created."
            )

        gesture_map = {g.id: g.name for g in gestures}

        # 2. Collect samples
        X_list = []
        y_list = []

        for g in gestures:
            samples = db.query(TrainingSample).filter(TrainingSample.gesture_id == g.id).all()
            for s in samples:
                # s.landmarks is a list of landmark dicts or already normalized vector
                if isinstance(s.landmarks, list):
                    # Flatten raw coordinates
                    raw_coords = []
                    # Check if multi-hand or single-hand
                    if s.landmarks and isinstance(s.landmarks[0], list):
                        for hand in s.landmarks:
                            for lm in hand:
                                raw_coords.extend([lm.get("x", 0.0), lm.get("y", 0.0), lm.get("z", 0.0)])
                    else:
                        for lm in s.landmarks:
                            raw_coords.extend([lm.get("x", 0.0), lm.get("y", 0.0), lm.get("z", 0.0)])

                    raw_arr = np.array(raw_coords, dtype=np.float32)
                    if len(raw_arr) < 63:
                        padded = np.zeros(63, dtype=np.float32)
                        padded[:len(raw_arr)] = raw_arr
                        raw_arr = padded
                    elif len(raw_arr) > 63 and len(raw_arr) < 126:
                        padded = np.zeros(126, dtype=np.float32)
                        padded[:len(raw_arr)] = raw_arr
                        raw_arr = padded

                    normalized = LandmarkNormalizer.normalize(raw_arr)
                    X_list.append(normalized)
                    y_list.append(g.name)

        if len(X_list) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient training samples ({len(X_list)} found). Please capture at least 5-10 samples."
            )

        # If user has only 1 gesture category, generate a negative 'NO_GESTURE' class with perturbed noise
        unique_labels = list(set(y_list))
        if len(unique_labels) == 1:
            base_class = unique_labels[0]
            # Add synthetic neutral/no-gesture baseline
            for _ in range(max(10, len(X_list))):
                noise = np.random.uniform(-0.15, 0.15, size=len(X_list[0])).astype(np.float32)
                X_list.append(noise)
                y_list.append("NO_GESTURE")

        # Standardize vector length across samples (e.g. 63 or 126)
        max_features = max(len(x) for x in X_list)
        standardized_X = []
        for x in X_list:
            if len(x) < max_features:
                pad = np.zeros(max_features, dtype=np.float32)
                pad[:len(x)] = x
                standardized_X.append(pad)
            else:
                standardized_X.append(x[:max_features])

        X = np.array(standardized_X, dtype=np.float32)
        y = np.array(y_list)

        # 3. Train/Test Split
        if len(X) >= 10:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
        else:
            X_train, X_test, y_train, y_test = X, X, y, y

        # 4. Instantiate Model
        model_type_upper = model_type.upper()
        if model_type_upper == "SVM":
            clf = SVC(probability=True, kernel='linear', random_state=42)
        elif model_type_upper == "KNN":
            clf = KNeighborsClassifier(n_neighbors=min(3, len(X_train)))
        else:
            clf = RandomForestClassifier(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)

        clf.fit(X_train, y_train)

        # 5. Evaluate
        preds = clf.predict(X_test)
        accuracy = float(accuracy_score(y_test, preds))

        # 6. Versioning
        last_model = db.query(MLModel).filter(
            MLModel.user_id == user_id
        ).order_by(MLModel.id.desc()).first()

        next_ver_num = 1
        if last_model and last_model.version.startswith("v"):
            try:
                next_ver_num = int(last_model.version[1:]) + 1
            except ValueError:
                next_ver_num = 1
        version_str = f"v{next_ver_num}"

        # 7. Persist Model
        user_dir = cls.get_models_dir(user_id)
        version_file = user_dir / f"model_{version_str}.pkl"
        active_file = user_dir / "active_model.pkl"

        model_payload = {
            "model": clf,
            "classes": clf.classes_.tolist(),
            "max_features": max_features,
            "version": version_str,
            "model_type": model_type_upper,
            "accuracy": accuracy,
            "sample_count": len(X_list)
        }

        joblib.dump(model_payload, version_file)
        joblib.dump(model_payload, active_file)

        # Update memory cache
        cls._model_cache[user_id] = model_payload

        # 8. Update DB metadata
        # Deactivate previous active models
        db.query(MLModel).filter(MLModel.user_id == user_id).update({"is_active": False})

        new_model_record = MLModel(
            user_id=user_id,
            model_path=str(active_file),
            model_type=model_type_upper,
            version=version_str,
            accuracy=accuracy,
            sample_count=len(X_list),
            is_active=True
        )
        db.add(new_model_record)
        db.commit()
        db.refresh(new_model_record)

        return {
            "model_id": new_model_record.id,
            "version": version_str,
            "accuracy": round(accuracy * 100, 1),
            "sample_count": len(X_list),
            "model_type": model_type_upper,
            "classes": clf.classes_.tolist()
        }

    @classmethod
    def load_active_model(cls, db: Session, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Loads active model payload for user with memory caching.
        """
        if user_id in cls._model_cache:
            return cls._model_cache[user_id]

        active_record = db.query(MLModel).filter(
            MLModel.user_id == user_id,
            MLModel.is_active == True
        ).first()

        if not active_record or not os.path.exists(active_record.model_path):
            # Check if active_model.pkl exists in user folder
            user_dir = cls.get_models_dir(user_id)
            active_file = user_dir / "active_model.pkl"
            if active_file.exists():
                payload = joblib.load(active_file)
                cls._model_cache[user_id] = payload
                return payload
            return None

        try:
            payload = joblib.load(active_record.model_path)
            cls._model_cache[user_id] = payload
            return payload
        except Exception as e:
            print(f"[Model Load Error] {e}")
            return None

    @classmethod
    def predict(
        cls,
        db: Session,
        user_id: int,
        normalized_vector: np.ndarray
    ) -> Tuple[str, float]:
        """
        Predicts gesture class and confidence for current user.
        Returns ("UNKNOWN", 0.0) if no model or low confidence.
        """
        model_payload = cls.load_active_model(db, user_id)
        if not model_payload:
            return "UNKNOWN", 0.0

        clf = model_payload["model"]
        max_features = model_payload.get("max_features", 63)

        # Standardize feature size
        vec = normalized_vector.copy()
        if len(vec) < max_features:
            pad = np.zeros(max_features, dtype=np.float32)
            pad[:len(vec)] = vec
            vec = pad
        elif len(vec) > max_features:
            vec = vec[:max_features]

        X_input = vec.reshape(1, -1)

        try:
            probs = clf.predict_proba(X_input)[0]
            max_idx = np.argmax(probs)
            confidence = float(probs[max_idx])
            pred_class = str(clf.classes_[max_idx])

            if pred_class == "NO_GESTURE":
                return "UNKNOWN", 0.0

            return pred_class, confidence
        except Exception as e:
            print(f"[Prediction Error] {e}")
            return "UNKNOWN", 0.0