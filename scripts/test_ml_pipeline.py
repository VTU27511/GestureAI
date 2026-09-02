import sys
from pathlib import Path
import numpy as np

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.database.session import SessionLocal
from app.models.user import User
from app.models.gesture import Gesture
from app.models.training_sample import TrainingSample
from app.services.ml_service import MLService
from app.vision.landmark_extractor import LandmarkExtractor
from app.vision.normalizer import LandmarkNormalizer

def run_ml_test():
    db = SessionLocal()
    try:
        demo = db.query(User).filter(User.username == "demo").first()
        assert demo is not None, "Demo user not found"

        gestures = db.query(Gesture).filter(Gesture.user_id == demo.id).all()
        assert len(gestures) >= 2, "Demo user should have at least 2 gestures"

        print(f"Adding training samples for user '{demo.username}'...")
        # Clear previous test samples
        for g in gestures:
            db.query(TrainingSample).filter(TrainingSample.gesture_id == g.id).delete()
        db.commit()

        # Generate distinctive synthetic landmark clusters for each gesture
        for g_idx, g in enumerate(gestures):
            print(f"  Generating 25 samples for gesture: {g.name}...")
            base_pattern = np.sin(np.linspace(0, (g_idx + 1) * np.pi, 21))
            for _ in range(25):
                sample_landmarks = []
                for i in range(21):
                    noise = np.random.normal(0, 0.02)
                    sample_landmarks.append({
                        "x": float(base_pattern[i] + noise),
                        "y": float((i * 0.04) + noise),
                        "z": float(noise)
                    })
                sample = TrainingSample(
                    gesture_id=g.id,
                    landmarks=sample_landmarks,
                    hand_count=1
                )
                db.add(sample)
        db.commit()

        # Train model
        print("\nTraining model via MLService.train_user_model...")
        res = MLService.train_user_model(db, demo.id, model_type="RANDOM_FOREST")
        print(f"  Version:     {res['version']}")
        print(f"  Accuracy:    {res['accuracy']}%")
        print(f"  Sample Count:{res['sample_count']}")
        print(f"  Classes:     {res['classes']}")

        assert res['accuracy'] >= 90.0, f"Expected accuracy >= 90%, got {res['accuracy']}%"

        # Test prediction on a sample
        test_vec = np.zeros(63, dtype=np.float32)
        base = np.sin(np.linspace(0, np.pi, 21))
        for i in range(21):
            test_vec[i*3] = base[i]
            test_vec[i*3+1] = i * 0.04
            test_vec[i*3+2] = 0.0

        norm_vec = LandmarkNormalizer.normalize(test_vec)
        pred, conf = MLService.predict(db, demo.id, norm_vec)
        print(f"\nPrediction Test on {gestures[0].name}:")
        print(f"  Predicted Gesture: {pred}")
        print(f"  Confidence:        {conf*100:.1f}%")

        assert pred == gestures[0].name, f"Expected {gestures[0].name}, got {pred}"
        print("\n[SUCCESS] ML Pipeline and model training test passed with flying colors!")

    finally:
        db.close()

if __name__ == "__main__":
    run_ml_test()