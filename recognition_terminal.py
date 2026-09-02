import sys
import os
import time
import argparse
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(dotenv_path=backend_dir / ".env")

import cv2
import numpy as np
from app.database.session import SessionLocal
from app.models.user import User
from app.models.gesture import Gesture, GestureType
from app.services.ml_service import MLService
from app.services.speech_service import SpeechEngine
from app.vision.hand_detector import HandDetector
from app.vision.landmark_extractor import LandmarkExtractor
from app.vision.normalizer import LandmarkNormalizer

def run_terminal_recognition(user_identifier: str):
    db = SessionLocal()
    try:
        # Find user by ID or Username
        user = None
        if user_identifier.isdigit():
            user = db.query(User).filter(User.id == int(user_identifier)).first()
        if not user:
            user = db.query(User).filter(User.username == user_identifier).first()

        if not user:
            print(f"[Error] User '{user_identifier}' not found in database.")
            return

        print(f"Loading active model for user: {user.name} (@{user.username})...")
        model_payload = MLService.load_active_model(db, user.id)
        if not model_payload:
            print("[Warning] No active trained model found for this user.")
            print("Please capture samples and train a model first in the Web Dashboard.")
            return

        # Pre-cache user gestures
        gestures = db.query(Gesture).filter(Gesture.user_id == user.id).all()
        gesture_map = {g.name: g for g in gestures}

        print(f"Loaded Model {model_payload.get('version', 'v1')} (Accuracy: {round(model_payload.get('accuracy', 0)*100, 1)}%)")
        print(f"Recognizable gestures: {', '.join(model_payload.get('classes', []))}")
        print("\nInitializing camera...")

        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap = cv2.VideoCapture(0)

        if not cap.isOpened():
            print("[Error] Could not open webcam.")
            return

        hand_detector = HandDetector(max_num_hands=2)
        speech_engine = SpeechEngine.get_instance()
        speech_engine.reset_state()

        prev_time = time.time()
        fps = 30.0

        last_display_gesture = ""
        last_display_conf = 0.0

        print("\n========================================")
        print("     GESTUREAI REAL-TIME RECOGNITION    ")
        print("========================================")
        print(f"User:   {user.name}")
        print(f"Camera: ACTIVE")
        print("Press CTRL+C in terminal or 'q' in window to exit.")
        print("----------------------------------------\n")

        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                time.sleep(0.02)
                continue

            frame = cv2.flip(frame, 1)

            curr_time = time.time()
            time_diff = curr_time - prev_time
            if time_diff > 0:
                fps = 0.9 * fps + 0.1 * (1.0 / time_diff)
            prev_time = curr_time

            # Hand landmark processing
            results, hand_count, _ = hand_detector.process(frame)

            detected_gesture = "UNKNOWN"
            confidence = 0.0
            speech_out = "..."

            if hand_count > 0:
                g_type = GestureType.TWO_HANDS if hand_count >= 2 else GestureType.ONE_HAND
                raw_vec, valid = LandmarkExtractor.extract_vector(results, g_type)

                if valid or hand_count >= 1:
                    norm_vec = LandmarkNormalizer.normalize(raw_vec)
                    pred_name, pred_conf = MLService.predict(db, user.id, norm_vec)

                    confidence = pred_conf
                    if pred_conf >= speech_engine.confidence_threshold:
                        detected_gesture = pred_name
                        g_obj = gesture_map.get(pred_name)
                        speech_out = g_obj.speech_text if g_obj else pred_name

                        # Speak offline
                        speech_engine.process_recognition(detected_gesture, speech_out, confidence)

            # In-place terminal status update (clean single-line or refresh without flooding)
            status_line = (
                f"\r[FPS: {fps:4.1f}] Hands: {hand_count} | "
                f"Gesture: {detected_gesture:15s} | "
                f"Confidence: {confidence*100:5.1f}% | "
                f"Speech: '{speech_out}'     "
            )
            sys.stdout.write(status_line)
            sys.stdout.flush()

            # Optional OpenCV preview window
            annotated = hand_detector.draw_landmarks(frame, results)
            cv2.putText(
                annotated,
                f"{detected_gesture} ({confidence*100:.1f}%)",
                (15, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.9,
                (0, 255, 255) if detected_gesture != "UNKNOWN" else (200, 200, 200),
                2
            )
            cv2.imshow("GestureAI - Real-Time Recognition (Press 'q' to Quit)", annotated)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    except KeyboardInterrupt:
        print("\n\n[Exit] User interrupted with CTRL+C.")
    finally:
        print("\nReleasing camera and resources...")
        if 'cap' in locals() and cap is not None:
            cap.release()
        cv2.destroyAllWindows()
        if 'hand_detector' in locals():
            hand_detector.close()
        db.close()
        print("Camera released cleanly. Goodbye!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GestureAI Standalone Terminal Recognition")
    parser.add_argument("--user", type=str, required=True, help="User ID or Username")
    args = parser.parse_args()
    run_terminal_recognition(args.user)