import os
import time
import queue
import threading
from typing import Optional

class SpeechEngine:
    """
    Offline Windows speech engine with asynchronous worker queue,
    duplicate suppression, and configurable cooldown.
    """
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.speech_cooldown = float(os.getenv("SPEECH_COOLDOWN", "2.0"))
        self.confidence_threshold = float(os.getenv("CONFIDENCE_THRESHOLD", "0.85"))

        self.last_gesture: Optional[str] = None
        self.last_speak_time: float = 0.0

        self.queue: queue.Queue = queue.Queue(maxsize=10)
        self.worker_thread = threading.Thread(target=self._speech_worker, daemon=True)
        self.worker_thread.start()

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def _speech_worker(self):
        """
        Background worker thread executing offline Windows speech via SAPI.
        """
        speaker = None
        try:
            import pythoncom
            pythoncom.CoInitialize()
            import win32com.client
            speaker = win32com.client.Dispatch("SAPI.SpVoice")
        except Exception as e:
            print(f"[Speech Engine Warning] pywin32 SAPI init failed ({e}), using pyttsx3 fallback.")

        while True:
            try:
                text = self.queue.get()
                if not text:
                    self.queue.task_done()
                    continue

                if speaker is not None:
                    try:
                        # 1 = SVSFlagsAsync (asynchronous speak inside worker thread)
                        speaker.Speak(text, 0)
                    except Exception as e:
                        print(f"[Speech Speak Error] {e}")
                else:
                    # Fallback to pyttsx3
                    try:
                        import pyttsx3
                        engine = pyttsx3.init()
                        engine.say(text)
                        engine.runAndWait()
                    except Exception as e:
                        print(f"[Speech Fallback Error] {e}")

                self.queue.task_done()
            except Exception as e:
                print(f"[Speech Worker Exception] {e}")

    def speak(self, text: str):
        """Enqueue speech without blocking caller."""
        if not text or not text.strip():
            return
        try:
            # Drop older pending utterances if queue is full
            if self.queue.full():
                try:
                    self.queue.get_nowait()
                except queue.Empty:
                    pass
            self.queue.put_nowait(text.strip())
        except Exception:
            pass

    def process_recognition(
        self,
        gesture_name: str,
        speech_text: str,
        confidence: float
    ) -> bool:
        """
        Applies duplicate prevention rules, confidence gating, and cooldown.
        Returns True if speech was triggered.
        """
        if confidence < self.confidence_threshold:
            return False

        if not gesture_name or gesture_name.upper() == "UNKNOWN":
            return False

        if not speech_text or not speech_text.strip():
            return False

        now = time.time()

        # If gesture changed from previous, speak immediately
        if gesture_name != self.last_gesture:
            self.last_gesture = gesture_name
            self.last_speak_time = now
            self.speak(speech_text)
            return True

        # If same gesture, only repeat after cooldown has elapsed
        if (now - self.last_speak_time) >= self.speech_cooldown:
            self.last_speak_time = now
            self.speak(speech_text)
            return True

        return False

    def reset_state(self):
        """Reset history on session stop/start."""
        self.last_gesture = None
        self.last_speak_time = 0.0