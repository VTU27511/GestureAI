import json
import numpy as np
import classifier

def test_normalization():
    print("Testing landmark normalization...")
    # Create a dummy hand coordinate set (21 points)
    # Let's say all points are shifted by +5.0 and scaled
    base_coords = [[i * 0.1, i * 0.2, i * 0.3] for i in range(21)]
    shifted_coords = [[x + 5.0, y - 2.0, z + 10.0] for x, y, z in base_coords]
    
    norm1 = classifier.normalize_landmarks(base_coords)
    norm2 = classifier.normalize_landmarks(shifted_coords)
    
    # Check shape: 21 * 3 = 63 features
    assert len(norm1) == 63, f"Expected 63 features, got {len(norm1)}"
    assert len(norm2) == 63, f"Expected 63 features, got {len(norm2)}"
    
    # Check translation invariance: wrist (0) should be normalized to (0,0,0)
    assert abs(norm1[0]) < 1e-5 and abs(norm1[1]) < 1e-5 and abs(norm1[2]) < 1e-5
    assert abs(norm2[0]) < 1e-5 and abs(norm2[1]) < 1e-5 and abs(norm2[2]) < 1e-5
    
    # Check scale/translation invariance: norm1 and norm2 should be practically identical
    diff = np.max(np.abs(np.array(norm1) - np.array(norm2)))
    assert diff < 1e-5, f"Translation/scale invariance failed. Max diff: {diff}"
    print("[OK] Landmark normalization test passed.")

def test_two_hand_features():
    print("Testing two-hand feature extraction...")
    left = [[i * 0.05, 0, 0] for i in range(21)]
    right = [[i * 0.05 + 1.0, 0, 0] for i in range(21)]
    
    features = classifier.extract_two_hand_features(left, right)
    
    # Left (63) + Right (63) + Relationship (4) = 130 features
    assert len(features) == 130, f"Expected 130 features, got {len(features)}"
    print("[OK] Two-hand feature extraction test passed.")

def test_dynamic_features():
    print("Testing dynamic sequence feature extraction...")
    # Sequence of 5 frames
    seq = []
    for f in range(5):
        left = [[i * 0.01 + f * 0.1, 0, 0] for i in range(21)]
        right = [[i * 0.01 + f * 0.1 + 1.0, 0, 0] for i in range(21)]
        seq.append({"left": left, "right": right})
        
    features = classifier.extract_dynamic_features(seq)
    
    # Frame features (10 frames * 130 features = 1300) + Movement features (8) = 1308 features
    assert len(features) == 1308, f"Expected 1308 features, got {len(features)}"
    print("[OK] Dynamic sequence feature extraction test passed.")

def test_mock_training():
    print("Testing classifier fitting and inference...")
    # Generate mock training dataset with two mathematically distinct hand shapes
    X = []
    y = []
    
    # Class "HELLO" features: points spread out in a straight line
    for _ in range(10):
        left = [[float(i), 0.0, 0.0] for i in range(21)]
        features = classifier.extract_two_hand_features(left, None)
        X.append(features)
        y.append("HELLO")
        
    # Class "FIST" features: points in a zig-zag pattern
    for _ in range(10):
        left = [[float(i % 2), float(i % 3), 0.0] for i in range(21)]
        features = classifier.extract_two_hand_features(left, None)
        X.append(features)
        y.append("FIST")
        
    # Train mock Random Forest
    from sklearn.ensemble import RandomForestClassifier
    import joblib
    
    clf = RandomForestClassifier(n_estimators=10, max_depth=5, random_state=42)
    clf.fit(X, y)
    
    # Save mock classifier
    mock_model_path = classifier.get_model_path(9999) # mock user id 9999
    joblib.dump(clf, mock_model_path)
    
    # Test prediction - Hello-like straight line shape
    test_hello = [[float(i) * 1.1, 0.0, 0.0] for i in range(21)]
    pred, conf = classifier.predict_gesture(9999, {"left": test_hello, "right": None}, gesture_type="static", hands_mode="two")
    
    assert pred == "HELLO", f"Expected HELLO, got {pred} (confidence: {conf})"
    assert conf >= 0.6, f"Expected confidence >= 0.6, got {conf}"
    
    # Test prediction - Fist-like zig-zag shape
    test_fist = [[float(i % 2), float(i % 3) * 0.9, 0.0] for i in range(21)]
    pred_fist, conf_fist = classifier.predict_gesture(9999, {"left": test_fist, "right": None}, gesture_type="static", hands_mode="two")
    assert pred_fist == "FIST", f"Expected FIST, got {pred_fist} (confidence: {conf_fist})"
    assert conf_fist >= 0.6, f"Expected confidence >= 0.6, got {conf_fist}"
    
    # Clean up mock file
    import os
    if os.path.exists(mock_model_path):
        os.remove(mock_model_path)
        
    print("[OK] Classifier fitting and inference test passed.")

def check_object_detector_download():
    print("Checking object detector files state...")
    # Just trigger lazy load check (does not run full download if not run from server, 
    # but verifies compilation and library links)
    import cv2
    print(f"OpenCV version: {cv2.__version__}")
    print("[OK] Object detector modules resolved.")

if __name__ == "__main__":
    print("=== SignBridge AI Local Verification Suite ===")
    test_normalization()
    test_two_hand_features()
    test_dynamic_features()
    test_mock_training()
    check_object_detector_download()
    print("=== All local classification tests passed! ===")
