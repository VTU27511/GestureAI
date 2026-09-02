import json
import base64
import time
import os
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional

import database
import models
import schemas
import auth
import classifier
import utils

# Create database tables
database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="SignBridge AI API", version="1.0.0")

# CORS setup for local React client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all during local dev to avoid CORS blocker
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Authentication Routes ---

@app.post("/api/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    hashed_pwd = auth.hash_password(user_data.password)
    new_user = models.User(username=user_data.username, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/auth/login", response_model=schemas.TokenResponse)
def login(user_data: schemas.UserCreate, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if not user or not auth.verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password"
        )
    token = auth.create_access_token(user.username)
    return {"access_token": token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# --- Gesture Dictionary Routes ---

@app.get("/api/gestures", response_model=List[schemas.GestureResponse])
def get_gestures(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    gestures = db.query(models.Gesture).filter(models.Gesture.user_id == current_user.id).all()
    # Add sample counts manually to match schemas.GestureResponse
    response_data = []
    for g in gestures:
        sample_count = db.query(models.GestureSample).filter(models.GestureSample.gesture_id == g.id).count()
        response_data.append(
            schemas.GestureResponse(
                id=g.id,
                name=g.name,
                type=g.type,
                hands=g.hands,
                requires_object=g.requires_object,
                object_label=g.object_label,
                created_at=g.created_at,
                sample_count=sample_count
            )
        )
    return response_data

@app.post("/api/gestures", response_model=schemas.GestureResponse)
def create_gesture(gesture_data: schemas.GestureCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    # Check if duplicate name
    existing = db.query(models.Gesture).filter(
        models.Gesture.user_id == current_user.id,
        models.Gesture.name == gesture_data.name.upper()
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A gesture named '{gesture_data.name}' already exists in your dictionary."
        )
        
    new_gesture = models.Gesture(
        user_id=current_user.id,
        name=gesture_data.name.upper(),
        type=gesture_data.type,
        hands=gesture_data.hands,
        requires_object=gesture_data.requires_object,
        object_label=gesture_data.object_label.lower() if gesture_data.object_label else None
    )
    db.add(new_gesture)
    db.commit()
    db.refresh(new_gesture)
    
    return schemas.GestureResponse(
        id=new_gesture.id,
        name=new_gesture.name,
        type=new_gesture.type,
        hands=new_gesture.hands,
        requires_object=new_gesture.requires_object,
        object_label=new_gesture.object_label,
        created_at=new_gesture.created_at,
        sample_count=0
    )

@app.delete("/api/gestures/{gesture_id}")
def delete_gesture(gesture_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    gesture = db.query(models.Gesture).filter(
        models.Gesture.id == gesture_id,
        models.Gesture.user_id == current_user.id
    ).first()
    if not gesture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gesture not found"
        )
    
    db.delete(gesture)
    db.commit()
    
    # Remove custom trained model file if gesture database changed, prompting retrain
    model_path = classifier.get_model_path(current_user.id)
    if os.path.exists(model_path):
        try:
            os.remove(model_path)
        except Exception:
            pass
            
    return {"detail": "Gesture deleted successfully"}

@app.delete("/api/gestures")
def delete_all_gestures(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    db.query(models.Gesture).filter(models.Gesture.user_id == current_user.id).delete()
    db.commit()
    
    # Remove custom trained model file
    model_path = classifier.get_model_path(current_user.id)
    if os.path.exists(model_path):
        try:
            os.remove(model_path)
        except Exception:
            pass
            
    return {"detail": "All gestures and model classifiers deleted successfully"}


# --- Gesture Landmark Sample Recording Routes ---

@app.post("/api/gestures/{gesture_id}/samples")
def add_sample(gesture_id: int, sample_data: schemas.SampleCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    gesture = db.query(models.Gesture).filter(
        models.Gesture.id == gesture_id,
        models.Gesture.user_id == current_user.id
    ).first()
    if not gesture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gesture not found"
        )
        
    new_sample = models.GestureSample(
        gesture_id=gesture.id,
        landmarks_json=sample_data.landmarks_json
    )
    db.add(new_sample)
    db.commit()
    
    # Return updated count
    count = db.query(models.GestureSample).filter(models.GestureSample.gesture_id == gesture.id).count()
    return {"message": "Sample added successfully", "sample_count": count}

@app.delete("/api/gestures/{gesture_id}/samples")
def clear_samples(gesture_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    gesture = db.query(models.Gesture).filter(
        models.Gesture.id == gesture_id,
        models.Gesture.user_id == current_user.id
    ).first()
    if not gesture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gesture not found"
        )
    db.query(models.GestureSample).filter(models.GestureSample.gesture_id == gesture.id).delete()
    db.commit()
    return {"detail": "All samples for this gesture cleared"}


# --- Model Training ---

@app.post("/api/gestures/train")
def train_model(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    success, message = classifier.train_user_model(current_user.id, db)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    return {"message": message}

@app.get("/api/gestures/status")
def check_model_status(current_user: models.User = Depends(auth.get_current_user)):
    model_path = classifier.get_model_path(current_user.id)
    is_trained = os.path.exists(model_path)
    return {
        "is_trained": is_trained,
        "last_trained": datetime.fromtimestamp(os.path.getmtime(model_path)) if is_trained else None
    }


# --- System Resource Metrics ---

@app.get("/api/system/stats", response_model=schemas.SystemStats)
def get_system_stats(current_user: models.User = Depends(auth.get_current_user)):
    stats = utils.get_system_metrics()
    
    # Find active models cached in memory
    loaded = []
    if current_user.id in classifier._model_cache:
        loaded.append(f"user_{current_user.id}_model")
    if classifier._net is not None:
        loaded.append("MobileNet_SSD")
        
    return schemas.SystemStats(
        cpu_percent=stats["cpu_percent"],
        ram_percent=stats["ram_percent"],
        ram_used_mb=stats["ram_used_mb"],
        loaded_models=loaded
    )


# --- Recognition History Route ---

@app.get("/api/history", response_model=List[schemas.HistoryResponse])
def get_history(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    return db.query(models.RecognitionHistory)\
             .filter(models.RecognitionHistory.user_id == current_user.id)\
             .order_by(models.RecognitionHistory.timestamp.desc())\
             .limit(15)\
             .all()


# --- REAL-TIME RECOGNITION WEBSOCKET ---

@app.websocket("/api/ws/recognize")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    await websocket.accept()
    
    # Verify token on connection
    try:
        username = auth.verify_token(token)
        # Fetch user
        db = database.SessionLocal()
        user = db.query(models.User).filter(models.User.username == username).first()
        if not user:
            await websocket.send_json({"error": "User not found"})
            await websocket.close()
            db.close()
            return
    except Exception as e:
        await websocket.send_json({"error": f"Authentication failed: {str(e)}"})
        await websocket.close()
        return

    # User's gesture specifications to check object requirements
    user_gestures = db.query(models.Gesture).filter(models.Gesture.user_id == user.id).all()
    gesture_obj_map = {g.name: (g.requires_object, g.object_label) for g in user_gestures}
    db.close()

    last_saved_prediction = None
    stable_prediction_count = 0

    try:
        while True:
            # Receive frame data (landmarks, optional base64 image)
            data = await websocket.receive_text()
            message = json.loads(data)
            
            start_time = time.perf_counter()
            
            gesture_type = message.get("gesture_type", "static")
            hands_mode = message.get("hands_mode", "one")
            
            # Extract landmarks based on mode
            if gesture_type == "static":
                if hands_mode == "two":
                    input_data = {
                        "left": message.get("left"),
                        "right": message.get("right")
                    }
                else:
                    # One hand
                    left = message.get("left")
                    right = message.get("right")
                    input_data = left if left else right
            else: # dynamic
                input_data = message.get("sequence", [])
                
            # Perform inference
            prediction, confidence = classifier.predict_gesture(
                user.id, input_data, gesture_type=gesture_type, hands_mode=hands_mode
            )
            
            # Check if prediction requires object detection
            if prediction and prediction != "Unknown Gesture":
                requires_obj, target_label = gesture_obj_map.get(prediction, (False, None))
                if requires_obj and target_label:
                    # Look for base64 image
                    img_data = message.get("image")
                    if img_data:
                        try:
                            # Strip prefix if present (e.g. data:image/jpeg;base64,)
                            if "," in img_data:
                                img_data = img_data.split(",")[1]
                            image_bytes = base64.b64decode(img_data)
                            
                            # Run SSD
                            obj_present = classifier.detect_object_in_image(image_bytes, target_label)
                            if not obj_present:
                                # Overwrite prediction because object was not detected
                                prediction = "Unknown Gesture"
                                confidence = 0.0
                        except Exception as e:
                            print(f"WS image decode error: {e}")
                            prediction = "Unknown Gesture"
                            confidence = 0.0
                    else:
                        # Image missing but object required: invalidate gesture
                        prediction = "Unknown Gesture"
                        confidence = 0.0
            
            latency_ms = (time.perf_counter() - start_time) * 1000
            
            # Write to history database if stabilized
            if prediction and prediction != "Unknown Gesture" and prediction != "No Model Trained":
                if prediction == last_saved_prediction:
                    stable_prediction_count = 0  # Already logged this gesture session
                else:
                    stable_prediction_count += 1
                    if stable_prediction_count >= 3:
                        db_session = database.SessionLocal()
                        try:
                            history_entry = models.RecognitionHistory(
                                user_id=user.id,
                                gesture_name=prediction,
                                confidence=confidence
                            )
                            db_session.add(history_entry)
                            db_session.commit()
                            last_saved_prediction = prediction
                            stable_prediction_count = 0
                        except Exception as e:
                            print(f"Failed to save history: {e}")
                        finally:
                            db_session.close()
            elif prediction == "Unknown Gesture" or prediction == "No Model Trained":
                last_saved_prediction = None
                stable_prediction_count = 0
            
            # Send result
            await websocket.send_json({
                "gesture": prediction if prediction else "No Model Trained",
                "confidence": confidence,
                "latency_ms": round(latency_ms, 2)
            })
            
    except WebSocketDisconnect:
        print(f"WS client disconnected: {user.username}")
    except Exception as e:
        print(f"WS processing error: {e}")
        try:
            await websocket.send_json({"error": f"Internal server error: {str(e)}"})
        except Exception:
            pass
