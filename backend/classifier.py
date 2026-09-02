import os
import json
import urllib.request
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib

# Directory to save trained model files
MODELS_DIR = os.path.join(os.path.dirname(__file__), "trained_models")
os.makedirs(MODELS_DIR, exist_ok=True)

# MobileNet-SSD paths for object detection
SSD_PROTOTXT_URL = "https://raw.githubusercontent.com/chuanqi305/MobileNet-SSD/master/deploy.prototxt"
SSD_MODEL_URL = "https://github.com/chuanqi305/MobileNet-SSD/raw/master/mobilenet_iter_73000.caffemodel"

SSD_DIR = os.path.join(os.path.dirname(__file__), "object_detector_models")
os.makedirs(SSD_DIR, exist_ok=True)

PROTOTXT_PATH = os.path.join(SSD_DIR, "deploy.prototxt")
MODEL_PATH = os.path.join(SSD_DIR, "mobilenet.caffemodel")

# SSD COCO/PASCAL VOC classes
CLASSES = [
    "background", "aeroplane", "bicycle", "bird", "boat",
    "bottle", "bus", "car", "cat", "chair", "cow", "diningtable",
    "dog", "horse", "motorbike", "person", "pottedplant",
    "sheep", "sofa", "train", "tvmonitor"
]

_net = None

def load_object_detector():
    """Lazy load MobileNet-SSD to conserve startup memory."""
    global _net
    if _net is not None:
        return _net
        
    import cv2
    
    # Download files if they do not exist
    if not os.path.exists(PROTOTXT_PATH):
        print("Downloading MobileNet-SSD prototxt...")
        try:
            urllib.request.urlretrieve(SSD_PROTOTXT_URL, PROTOTXT_PATH)
        except Exception as e:
            print(f"Failed to download prototxt: {e}")
            
    if not os.path.exists(MODEL_PATH):
        print("Downloading MobileNet-SSD model (5MB)...")
        try:
            urllib.request.urlretrieve(SSD_MODEL_URL, MODEL_PATH)
        except Exception as e:
            print(f"Failed to download model: {e}")

    if os.path.exists(PROTOTXT_PATH) and os.path.exists(MODEL_PATH):
        try:
            _net = cv2.dnn.readNetFromCaffe(PROTOTXT_PATH, MODEL_PATH)
            print("MobileNet-SSD loaded successfully.")
        except Exception as e:
            print(f"Error loading Caffe model: {e}")
            _net = None
    else:
        print("Object detector files not available; object detection will fall back to mock.")
        _net = None
        
    return _net

def detect_object_in_image(image_bytes, target_label):
    """Detects if target_label is present in the image using lightweight SSD.
    Only called occasionally (e.g., every 500-1000ms) when gesture requires it.
    """
    net = load_object_detector()
    if net is None:
        # Fallback: if model files couldn't download, return true for target object to allow testing
        return True
        
    import cv2
    try:
        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return False
            
        h, w = img.shape[:2]
        # Resize to 300x300 for MobileNet-SSD
        blob = cv2.dnn.blobFromImage(cv2.resize(img, (300, 300)), 0.007843, (300, 300), 127.5)
        net.setInput(blob)
        detections = net.forward()
        
        for i in range(detections.shape[2]):
            confidence = detections[0, 0, i, 2]
            if confidence > 0.5: # 50% confidence threshold
                class_id = int(detections[0, 0, i, 1])
                if class_id < len(CLASSES):
                    label = CLASSES[class_id]
                    if label.lower() == target_label.lower():
                        return True
        return False
    except Exception as e:
        print(f"Error in object detection: {e}")
        return True # Fallback to true so custom gestures aren't permanently locked

def normalize_landmarks(landmarks):
    """Normalize 21 hand landmarks to be translation and scale invariant.
    landmarks: list of [x, y, z] coordinates or dictionary of {x, y, z}
    """
    if not landmarks:
        return [0.0] * 63
        
    # Convert dict format to list if necessary
    coords = []
    for lm in landmarks:
        if isinstance(lm, dict):
            coords.append([lm.get("x", 0.0), lm.get("y", 0.0), lm.get("z", 0.0)])
        else:
            coords.append(lm)
            
    if len(coords) != 21:
        # Pad or truncate to 21 landmarks
        coords = coords[:21] + [[0.0, 0.0, 0.0]] * max(0, 21 - len(coords))
        
    coords = np.array(coords)
    
    # 1. Translation invariance: shift wrist (landmark 0) to origin (0, 0, 0)
    wrist = coords[0]
    translated = coords - wrist
    
    # 2. Scale invariance: normalize by the distance between wrist (0) and middle finger knuckle (9)
    # Using 9 as stable baseline
    scale_dist = np.linalg.norm(translated[9])
    if scale_dist > 1e-6:
        normalized = translated / scale_dist
    else:
        normalized = translated
        
    return normalized.flatten().tolist()

def extract_two_hand_features(left_landmarks, right_landmarks):
    """Combine left and right landmarks with relationship features."""
    left_norm = normalize_landmarks(left_landmarks)
    right_norm = normalize_landmarks(right_landmarks)
    
    # Extract relationship features (distance, relative positions)
    if left_landmarks and right_landmarks:
        # Convert to numpy arrays to compute distance
        l_wrist = np.array([left_landmarks[0]["x"], left_landmarks[0]["y"], left_landmarks[0]["z"]]) if isinstance(left_landmarks[0], dict) else np.array(left_landmarks[0])
        r_wrist = np.array([right_landmarks[0]["x"], right_landmarks[0]["y"], right_landmarks[0]["z"]]) if isinstance(right_landmarks[0], dict) else np.array(right_landmarks[0])
        
        disp = r_wrist - l_wrist
        dist = np.linalg.norm(disp)
        rel_features = [disp[0], disp[1], disp[2], dist]
    else:
        # Fallback if one hand is missing
        rel_features = [0.0, 0.0, 0.0, 0.0]
        
    return left_norm + right_norm + rel_features

def extract_dynamic_features(sequence):
    """Extract features from a sequence of frames.
    sequence: list of landmark frames. Each frame has left and/or right hand landmarks.
    We'll handle up to 10 frames.
    """
    # Pad or truncate sequence to exactly 10 frames
    target_len = 10
    if len(sequence) > target_len:
        sequence = sequence[-target_len:]
    elif len(sequence) < target_len:
        # Pad with first frame copy to avoid jump artifacts
        first_frame = sequence[0] if sequence else {"left": None, "right": None}
        sequence = [first_frame] * (target_len - len(sequence)) + list(sequence)
        
    # Extract features for each frame
    frame_features = []
    left_wrists = []
    right_wrists = []
    
    for frame in sequence:
        left = frame.get("left")
        right = frame.get("right")
        
        # Hand coordinates for velocity calculation (use wrist)
        if left:
            lw = [left[0]["x"], left[0]["y"], left[0]["z"]] if isinstance(left[0], dict) else left[0]
            left_wrists.append(lw)
        if right:
            rw = [right[0]["x"], right[0]["y"], right[0]["z"]] if isinstance(right[0], dict) else right[0]
            right_wrists.append(rw)
            
        # Extract flat landmark representation for this frame
        flat_hands = extract_two_hand_features(left, right)
        frame_features.extend(flat_hands)
        
    # Temporal movement features (displacement and overall velocity)
    movement_features = []
    
    # Left hand overall movement (first frame wrist to last frame wrist)
    if len(left_wrists) >= 2:
        l_disp = np.array(left_wrists[-1]) - np.array(left_wrists[0])
        l_speed = np.linalg.norm(l_disp)
        movement_features.extend([l_disp[0], l_disp[1], l_disp[2], l_speed])
    else:
        movement_features.extend([0.0, 0.0, 0.0, 0.0])
        
    # Right hand overall movement
    if len(right_wrists) >= 2:
        r_disp = np.array(right_wrists[-1]) - np.array(right_wrists[0])
        r_speed = np.linalg.norm(r_disp)
        movement_features.extend([r_disp[0], r_disp[1], r_disp[2], r_speed])
    else:
        movement_features.extend([0.0, 0.0, 0.0, 0.0])
        
    return frame_features + movement_features

def get_model_path(user_id):
    return os.path.join(MODELS_DIR, f"user_{user_id}_classifier.joblib")

def train_user_model(user_id, db):
    """Trains a Random Forest classifier for the user based on database samples.
    Saves the joblib classifier file.
    """
    import models
    
    # Fetch all gestures for the user
    gestures = db.query(models.Gesture).filter(models.Gesture.user_id == user_id).all()
    if not gestures:
        return False, "No gestures created yet."
        
    X = []
    y = []
    
    gesture_count = 0
    for g in gestures:
        samples = db.query(models.GestureSample).filter(models.GestureSample.gesture_id == g.id).all()
        if len(samples) < 1: # require at least 1 sample to train a class
            continue
            
        gesture_count += 1
        for s in samples:
            landmarks_data = json.loads(s.landmarks_json)
            
            # Extract features based on gesture type
            if g.type == "static":
                if g.hands == "two":
                    left = landmarks_data.get("left")
                    right = landmarks_data.get("right")
                    features = extract_two_hand_features(left, right)
                else:
                    # One hand gesture
                    left = landmarks_data.get("left")
                    right = landmarks_data.get("right")
                    hand_landmarks = left if left else right
                    features = normalize_landmarks(hand_landmarks)
            else: # dynamic gesture
                # Sequence of frames
                seq = landmarks_data  # Should be a list of frames: [{"left":..., "right":...}, ...]
                features = extract_dynamic_features(seq)
                
            X.append(features)
            y.append(g.name)
            
    if gesture_count < 2:
        return False, "You need to record samples for at least 2 gestures to train the model."
        
    # We want to be CPU-friendly: few estimators, low depth.
    # RF trains in milliseconds and runs inference in microseconds.
    rf = RandomForestClassifier(n_estimators=30, max_depth=8, random_state=42)
    rf.fit(X, y)
    
    # Save the model
    model_path = get_model_path(user_id)
    joblib.dump(rf, model_path)
    
    return True, f"Model trained successfully with {gesture_count} gestures and {len(X)} samples."

# Cache dictionary for active models to avoid reloading joblib files from disk on every WebSocket frame
# Key: user_id, Value: (loaded_model_instance, timestamp)
_model_cache = {}

def load_user_model(user_id):
    """Loads the user's gesture model, using a cache to avoid disk reading overhead."""
    global _model_cache
    
    model_path = get_model_path(user_id)
    if not os.path.exists(model_path):
        return None
        
    # Check cache
    mtime = os.path.getmtime(model_path)
    if user_id in _model_cache:
        cached_model, cached_mtime = _model_cache[user_id]
        if cached_mtime == mtime:
            return cached_model
            
    # Load and cache
    try:
        model = joblib.load(model_path)
        _model_cache[user_id] = (model, mtime)
        return model
    except Exception as e:
        print(f"Error loading model for user {user_id}: {e}")
        return None

def predict_gesture(user_id, input_data, gesture_type="static", hands_mode="one"):
    """Infers the hand gesture.
    input_data: 
      - for static + one hand: single hand landmark list (length 21)
      - for static + two hand: dict {"left": ..., "right": ...}
      - for dynamic: sliding window sequence of frames [{"left": ..., "right": ...}, ...]
    """
    model = load_user_model(user_id)
    if model is None:
        return None, 0.0
        
    try:
        if gesture_type == "static":
            if hands_mode == "two":
                left = input_data.get("left")
                right = input_data.get("right")
                features = extract_two_hand_features(left, right)
            else:
                features = normalize_landmarks(input_data)
        else: # dynamic
            features = extract_dynamic_features(input_data)
            
        # Predict
        features_arr = np.array(features).reshape(1, -1)
        
        # Check feature size match (in case model was trained with different settings)
        expected_features = model.n_features_in_
        actual_features = features_arr.shape[1]
        
        if actual_features != expected_features:
            # Pad or truncate features to match expected model size to prevent ValueError
            if actual_features < expected_features:
                features_arr = np.pad(features_arr, ((0, 0), (0, expected_features - actual_features)), 'constant')
            else:
                features_arr = features_arr[:, :expected_features]
                
        # Class probabilities
        probs = model.predict_proba(features_arr)[0]
        max_idx = np.argmax(probs)
        confidence = float(probs[max_idx])
        prediction = model.classes_[max_idx]
        
        # Confidence threshold filtering: if confidence is too low, mark as unknown
        if confidence < 0.60:
            return "Unknown Gesture", confidence
            
        return prediction, confidence
    except Exception as e:
        print(f"Inference error: {e}")
        return None, 0.0
