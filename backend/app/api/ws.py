import time
import base64
import json
import asyncio
from typing import Optional
import cv2
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.user import User
from app.models.gesture import Gesture, GestureType
from app.models.training_sample import TrainingSample
from app.models.training_session import TrainingSession, TrainingStatus
from app.models.recognition_log import RecognitionLog
from app.services.auth_service import decode_access_token
from app.services.speech_service import SpeechEngine
from app.services.ml_service import MLService
from app.vision.camera import CameraManager
from app.vision.hand_detector import HandDetector
from app.vision.landmark_extractor import LandmarkExtractor
from app.vision.normalizer import LandmarkNormalizer
from app.vision.object_detector import ObjectDetector

router = APIRouter(tags=["WebSockets"])

def authenticate_ws(token: Optional[str], db: Session) -> Optional[User]:
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("user_id")
    if not user_id:
        return None
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    return user

@router.websocket("/ws/training/{gesture_id}")
async def ws_training(
    websocket: WebSocket,
    gesture_id: int,
    token: Optional[str] = Query(None)
):
    await websocket.accept()
    db = SessionLocal()

    try:
        user = authenticate_ws(token, db)
        if not user:
            await websocket.send_json({"error": "Unauthorized: Invalid or missing token"})
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # STRICT USER DATA ISOLATION
        gesture = db.query(Gesture).filter(
            Gesture.id == gesture_id,
            Gesture.user_id == user.id
        ).first()

        if not gesture:
            await websocket.send_json({"error": "Gesture not found or access denied."})
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        camera = CameraManager.get_instance()
        if not camera.open():
            await websocket.send_json({"error": "Unable to access webcam hardware."})
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
            return

        hand_detector = HandDetector(max_num_hands=2)
        object_detector = ObjectDetector()

        is_capturing = False
        sample_count = db.query(TrainingSample).filter(TrainingSample.gesture_id == gesture.id).count()
        valid_samples = 0
        invalid_samples = 0

        prev_time = time.time()
        fps = 30.0
        last_logged_gesture = None
        last_log_time = 0.0

        # Background listener for incoming control messages (start / stop capture)
        async def message_listener():
            nonlocal is_capturing, valid_samples, invalid_samples
            try:
                while True:
                    text = await websocket.receive_text()
                    msg = json.loads(text)
                    action = msg.get("action")
                    if action == "start":
                        is_capturing = True
                    elif action == "stop":
                        is_capturing = False
            except Exception:
                pass

        listener_task = asyncio.create_task(message_listener())

        try:
            while True:
                # Capture loop iteration
                success, frame = camera.read_frame()
                if not success or frame is None:
                    await asyncio.sleep(0.03)
                    continue

                curr_time = time.time()
                time_diff = curr_time - prev_time
                if time_diff > 0:
                    fps = 0.9 * fps + 0.1 * (1.0 / time_diff)
                prev_time = curr_time

                # Process hand landmarks
                results, hand_count, labels = hand_detector.process(frame)
                hand_detected = (hand_count > 0)

                # Validate detection against gesture type
                is_valid_frame = False
                if gesture.gesture_type == GestureType.ONE_HAND:
                    is_valid_frame = (hand_count >= 1)
                elif gesture.gesture_type == GestureType.TWO_HANDS:
                    is_valid_frame = (hand_count >= 2)
                elif gesture.gesture_type == GestureType.HAND_OBJECT:
                    matches, conf = object_detector.matches_target(frame, gesture.object_name)
                    is_valid_frame = (hand_count >= 1 and matches)

                # If user activated capture and frame is valid, save sample
                if is_capturing:
                    if is_valid_frame:
                        vector, valid_extract = LandmarkExtractor.extract_vector(results, gesture.gesture_type)
                        if valid_extract:
                            raw_landmarks = LandmarkExtractor.extract_raw_landmarks(results)
                            new_sample = TrainingSample(
                                gesture_id=gesture.id,
                                landmarks=raw_landmarks,
                                hand_count=hand_count
                            )
                            db.add(new_sample)
                            db.commit()

                            sample_count += 1
                            valid_samples += 1
                        else:
                            invalid_samples += 1
                    else:
                        invalid_samples += 1

                # Draw skeleton annotations on frame
                annotated = hand_detector.draw_landmarks(frame, results)

                # Encode to JPEG base64
                jpeg_bytes = CameraManager.encode_jpeg(annotated, quality=65)
                b64_frame = ""
                if jpeg_bytes:
                    b64_frame = "data:image/jpeg;base64," + base64.b64encode(jpeg_bytes).decode("utf-8")

                payload = {
                    "gesture_name": gesture.name,
                    "gesture_type": gesture.gesture_type.value,
                    "is_capturing": is_capturing,
                    "sample_count": sample_count,
                    "valid_samples": valid_samples,
                    "invalid_samples": invalid_samples,
                    "hand_detected": "DETECTED" if hand_detected else "NOT DETECTED",
                    "hand_count": hand_count,
                    "fps": round(fps, 1),
                    "status": "CAPTURING" if is_capturing else "STANDBY",
                    "frame": b64_frame
                }

                await websocket.send_json(payload)
                await asyncio.sleep(0.02)  # Yield to event loop (~30-40 fps)

        finally:
            listener_task.cancel()
            hand_detector.close()
            camera.release()

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS Training Exception] {e}")
    finally:
        db.close()


@router.websocket("/ws/recognition")
async def ws_recognition(
    websocket: WebSocket,
    token: Optional[str] = Query(None)
):
    await websocket.accept()
    db = SessionLocal()

    try:
        user = authenticate_ws(token, db)
        if not user:
            await websocket.send_json({"error": "Unauthorized: Invalid or missing token"})
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        camera = CameraManager.get_instance()
        if not camera.open():
            await websocket.send_json({"error": "Unable to access webcam hardware."})
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
            return

        hand_detector = HandDetector(max_num_hands=2)
        speech_engine = SpeechEngine.get_instance()
        speech_engine.reset_state()

        # Pre-load gestures map for this user
        user_gestures = db.query(Gesture).filter(Gesture.user_id == user.id).all()
        gesture_map = {g.name: g for g in user_gestures}

        is_running = True
        prev_time = time.time()
        fps = 30.0
        last_logged_gesture = None
        last_log_time = 0.0
        voice_language = "te"  # Default to fluent Telugu speech

        # Background listener for stop/start/language controls
        async def message_listener():
            nonlocal is_running, voice_language
            try:
                while True:
                    text = await websocket.receive_text()
                    msg = json.loads(text)
                    if msg.get("action") == "stop":
                        is_running = False
                    elif msg.get("action") == "start":
                        is_running = True
                    elif msg.get("action") == "set_language":
                        voice_language = msg.get("language", "te")
            except Exception:
                pass

        listener_task = asyncio.create_task(message_listener())

        try:
            while True:
                if not is_running:
                    await asyncio.sleep(0.1)
                    continue

                success, frame = camera.read_frame()
                if not success or frame is None:
                    await asyncio.sleep(0.03)
                    continue

                curr_time = time.time()
                time_diff = curr_time - prev_time
                if time_diff > 0:
                    fps = 0.9 * fps + 0.1 * (1.0 / time_diff)
                prev_time = curr_time

                # Process hand landmarks
                results, hand_count, _ = hand_detector.process(frame)

                detected_gesture = "UNKNOWN"
                confidence = 0.0
                meaning = ""
                speech_text = ""
                telugu_text = ""
                spoken_phrase = ""

                if hand_count > 0:
                    # Extract single-hand or two-hand vector based on hand count
                    g_type = GestureType.TWO_HANDS if hand_count >= 2 else GestureType.ONE_HAND
                    raw_vector, valid_extract = LandmarkExtractor.extract_vector(results, g_type)

                    if valid_extract or hand_count >= 1:
                        normalized = LandmarkNormalizer.normalize(raw_vector)
                        pred_name, pred_conf = MLService.predict(db, user.id, normalized)

                        confidence = pred_conf
                        if pred_conf >= speech_engine.confidence_threshold:
                            detected_gesture = pred_name
                            g_obj = gesture_map.get(pred_name)
                            if g_obj:
                                meaning = g_obj.meaning
                                speech_text = g_obj.speech_text
                            else:
                                meaning = pred_name
                                speech_text = pred_name

                            # Get fluent Telugu translation
                            telugu_text = speech_engine.to_fluent_telugu(detected_gesture, speech_text)

                            # Fluent Speech Output (Telugu default or English)
                            was_spoken, spoken_phrase = speech_engine.process_recognition(
                                detected_gesture,
                                speech_text,
                                confidence,
                                language=voice_language
                            )

                            # Record Recognition Log (throttled)
                            now_log = time.time()
                            if g_obj and (detected_gesture != last_logged_gesture or (now_log - last_log_time) >= 3.0):
                                last_logged_gesture = detected_gesture
                                last_log_time = now_log
                                try:
                                    log_entry = RecognitionLog(
                                        user_id=user.id,
                                        gesture_id=g_obj.id,
                                        confidence=confidence
                                    )
                                    db.add(log_entry)
                                    db.commit()
                                except Exception as e:
                                    db.rollback()
                                    print(f"[Log Error] {e}")
                        else:
                            detected_gesture = "UNKNOWN"

                # Draw skeleton annotations
                annotated = hand_detector.draw_landmarks(frame, results)

                # Draw HUD prediction overlay on frame
                cv2.putText(
                    annotated,
                    f"Gesture: {detected_gesture} ({round(confidence * 100, 1)}%)",
                    (15, 35),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (6, 182, 212) if detected_gesture != "UNKNOWN" else (148, 163, 184),
                    2
                )

                # Encode frame to base64
                jpeg_bytes = CameraManager.encode_jpeg(annotated, quality=65)
                b64_frame = ""
                if jpeg_bytes:
                    b64_frame = "data:image/jpeg;base64," + base64.b64encode(jpeg_bytes).decode("utf-8")

                payload = {
                    "gesture": detected_gesture,
                    "confidence": round(confidence * 100, 1),
                    "meaning": meaning,
                    "speech_text": speech_text,
                    "telugu_text": telugu_text,
                    "voice_language": voice_language,
                    "spoken_phrase": spoken_phrase if detected_gesture != "UNKNOWN" else "",
                    "fps": round(fps, 1),
                    "hand_count": hand_count,
                    "status": "RECOGNIZING",
                    "frame": b64_frame
                }

                await websocket.send_json(payload)
                await asyncio.sleep(0.02)

        finally:
            listener_task.cancel()
            hand_detector.close()
            camera.release()

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS Recognition Exception] {e}")
    finally:
        db.close()