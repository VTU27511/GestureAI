import os
import time
import threading
import cv2
from typing import Optional, Tuple
import numpy as np

class CameraManager:
    """
    Thread-safe OpenCV camera manager with reference counting,
    resolution configuration, and automatic hardware release.
    """
    _instance = None
    _lock = threading.Lock()

    def __init__(self, camera_index: int = 0):
        self.camera_index = camera_index
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_running = False
        self.active_users = 0
        self.thread_lock = threading.Lock()

        # Load configuration from environment
        self.width = int(os.getenv("CAMERA_WIDTH", "640"))
        self.height = int(os.getenv("CAMERA_HEIGHT", "480"))
        self.fps = int(os.getenv("PROCESSING_FPS", "30"))

    @classmethod
    def get_instance(cls, camera_index: int = 0):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls(camera_index)
            return cls._instance

    def acquire(self) -> bool:
        with self.thread_lock:
            self.active_users += 1
            if self.cap is not None and self.cap.isOpened():
                self.is_running = True
                return True

            try:
                # Use DirectShow on Windows for fastest access and proper release
                self.cap = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW)
                if not self.cap.isOpened():
                    self.cap = cv2.VideoCapture(self.camera_index)

                if not self.cap.isOpened():
                    print(f"[Camera Error] Unable to open camera index {self.camera_index}")
                    self.cap = None
                    self.is_running = False
                    self.active_users = max(0, self.active_users - 1)
                    return False

                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
                self.cap.set(cv2.CAP_PROP_FPS, self.fps)
                self.is_running = True
                print(f"[Camera] Hardware opened. Active clients: {self.active_users}")
                return True
            except Exception as e:
                print(f"[Camera Exception] {e}")
                self.is_running = False
                self.cap = None
                self.active_users = max(0, self.active_users - 1)
                return False

    def open(self) -> bool:
        return self.acquire()

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        with self.thread_lock:
            if not self.is_running or self.cap is None or not self.cap.isOpened():
                return False, None

            try:
                ret, frame = self.cap.read()
                if not ret or frame is None or frame.size == 0:
                    return False, None

                # Mirror frame for natural self-view
                frame = cv2.flip(frame, 1)
                return True, frame
            except Exception as e:
                print(f"[Camera Read Error] {e}")
                return False, None

    def release(self):
        with self.thread_lock:
            self.active_users = max(0, self.active_users - 1)
            print(f"[Camera] Disconnected by 1 client. Remaining active clients: {self.active_users}")
            if self.active_users == 0:
                self.is_running = False
                if self.cap is not None:
                    try:
                        self.cap.release()
                        print("[Camera] Hardware fully released and turned OFF.")
                    except Exception as e:
                        print(f"[Camera Release Error] {e}")
                    finally:
                        self.cap = None

    def force_release(self):
        with self.thread_lock:
            self.active_users = 0
            self.is_running = False
            if self.cap is not None:
                try:
                    self.cap.release()
                    print("[Camera] Hardware force released and turned OFF.")
                except Exception as e:
                    print(f"[Camera Release Error] {e}")
                finally:
                    self.cap = None

    @staticmethod
    def encode_jpeg(frame: np.ndarray, quality: int = 70) -> Optional[bytes]:
        try:
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
            ret, buffer = cv2.imencode('.jpg', frame, encode_param)
            if ret:
                return buffer.tobytes()
            return None
        except Exception:
            return None