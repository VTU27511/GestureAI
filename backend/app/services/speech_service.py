import os
import time
import queue
import hashlib
import threading
from typing import Optional, Tuple

TELUGU_PHRASEBOOK = {
    "HELLO": "నమస్కారం! బాగున్నారా?",
    "HELLO! NICE TO MEET YOU.": "నమస్కారం! మిమ్మల్ని కలవడం చాలా సంతోషంగా ఉంది.",
    "HI": "నమస్కారం! ఎలా ఉన్నారు?",
    "NAMASTE": "నమస్కారం, అందరికీ శుభోదయం!",
    "OK": "నేను బాగున్నాను మిత్రమా, అంతా సవ్యంగా ఉంది.",
    "OKAY": "సరే, అంతా బాగుంది.",
    "I AM OK BUDDY": "నేను బాగున్నాను మిత్రమా, ధన్యవాదాలు.",
    "THANK YOU": "చాలా ధన్యవాదాలు!",
    "THANKS": "ధన్యవాదాలు!",
    "DISLIKE": "నాకు ఇది నచ్చలేదు.",
    "LIKE": "చాలా బాగుంది, నాకు నచ్చింది.",
    "SUPER": "చాలా అద్భుతంగా ఉంది, సూపర్!",
    "GREAT JOB!": "చాలా గొప్పగా చేసారు, అద్భుతం!",
    "PEACE": "శాంతి మరియు విజయం లభించుగాక.",
    "STOP": "దయచేసి ఇక్కడే ఆగండి.",
    "WHATSAPP": "వాట్సాప్ సందేశం పంపండి.",
    "WHATSAPP RANJITH": "వాట్సాప్ రంజిత్, సందేశం పంపండి.",
    "YES": "అవును, నిజమే.",
    "NO": "లేదు, కాదు.",
    "HELP": "దయచేసి నాకు సహాయం చేయండి.",
    "WATER": "నాకు త్రాగడానికి మంచి నీళ్లు కావాలి.",
    "FOOD": "నాకు ఆకలిగా ఉంది, ఆహారం కావాలి.",
    "CALL": "దయచేసి నాకు ఫోన్ చేయండి.",
    "GOOD MORNING": "శుభోదయం!",
    "GOOD NIGHT": "శుభరాత్రి, ప్రశాంతంగా నిద్రించండి.",
}

class SpeechEngine:
    """
    High-fidelity Telugu & English speech engine with asynchronous worker queue,
    gTTS native fluency, audio disk caching, duplicate suppression, and cooldown.
    """
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.speech_cooldown = float(os.getenv("SPEECH_COOLDOWN", "2.2"))
        self.confidence_threshold = float(os.getenv("CONFIDENCE_THRESHOLD", "0.85"))
        self.default_language = os.getenv("DEFAULT_LANGUAGE", "te")

        self.last_gesture: Optional[str] = None
        self.last_speak_time: float = 0.0

        self.cache_dir = os.path.join(os.path.dirname(__file__), "..", "..", "speech_cache")
        os.makedirs(self.cache_dir, exist_ok=True)

        self.queue: queue.Queue = queue.Queue(maxsize=10)
        self.worker_thread = threading.Thread(target=self._speech_worker, daemon=True)
        self.worker_thread.start()

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    @staticmethod
    def is_telugu_script(text: str) -> bool:
        """Check if string contains native Telugu unicode characters."""
        return any(0x0C00 <= ord(c) <= 0x0C7F for c in text)

    def to_fluent_telugu(self, gesture_name: str, speech_text: str) -> str:
        """
        Translates or refines gesture text into natural, fluent, native Telugu phrasing.
        """
        # 1. If text is already native Telugu script, return it directly
        if self.is_telugu_script(speech_text):
            return speech_text

        # 2. Check exact matches in phrasebook
        clean_g = gesture_name.strip().upper()
        clean_s = speech_text.strip().upper()

        if clean_s in TELUGU_PHRASEBOOK:
            return TELUGU_PHRASEBOOK[clean_s]
        if clean_g in TELUGU_PHRASEBOOK:
            return TELUGU_PHRASEBOOK[clean_g]

        # 3. Keyword matching for semantic mapping
        combined = f"{clean_g} {clean_s}"
        if "HELLO" in combined or "HI" in combined:
            return "నమస్కారం! బాగున్నారా?"
        if "NAMASTE" in combined:
            return "నమస్కారం, శుభోదయం!"
        if "THANK" in combined:
            return "చాలా ధన్యవాదాలు!"
        if "OK" in combined:
            return "అంతా బాగుంది, సరే!"
        if "WHATSAPP" in combined:
            return "వాట్సాప్ సందేశం పంపండి."
        if "PEACE" in combined:
            return "శాంతి మరియు విజయం!"
        if "DISLIKE" in combined:
            return "నాకు ఇది నచ్చలేదు."
        if "LIKE" in combined or "SUPER" in combined or "GREAT" in combined:
            return "చాలా బాగుంది, సూపర్!"
        if "STOP" in combined:
            return "దయచేసి ఆగండి."
        if "HELP" in combined:
            return "దయచేసి సహాయం చేయండి."
        if "WATER" in combined:
            return "నాకు మంచి నీళ్లు కావాలి."
        if "FOOD" in combined:
            return "నాకు ఆహారం కావాలి."
        if "CALL" in combined:
            return "దయచేసి ఫోన్ చేయండి."

        # 4. Fallback: Return speech_text for transliterated Telugu synthesis
        return speech_text

    def _play_audio_file(self, file_path: str):
        """Play synthesized audio file via pygame mixer."""
        try:
            import pygame
            if not pygame.mixer.get_init():
                pygame.mixer.init()
            pygame.mixer.music.load(file_path)
            pygame.mixer.music.play()
            while pygame.mixer.music.get_busy():
                time.sleep(0.04)
            return True
        except Exception as e:
            print(f"[Speech Playback Error] {e}")
            return False

    def _synthesize_telugu_gtts(self, text: str) -> Optional[str]:
        """Synthesizes fluent native Telugu speech via gTTS and caches locally."""
        hash_id = hashlib.md5(text.encode("utf-8")).hexdigest()
        file_path = os.path.join(self.cache_dir, f"te_{hash_id}.mp3")

        if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
            return file_path

        try:
            from gtts import gTTS
            tts = gTTS(text=text, lang="te", slow=False)
            tts.save(file_path)
            return file_path
        except Exception as e:
            print(f"[gTTS Telugu Synthesis Warning] {e}")
            return None

    def _speech_worker(self):
        """
        Background worker thread: plays fluent Telugu via gTTS / pygame,
        or English via Windows SAPI / pyttsx3.
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
                item = self.queue.get()
                if not item:
                    self.queue.task_done()
                    continue

                text, lang = item

                if lang == "te" or self.is_telugu_script(text):
                    # Fluent Telugu synthesis & playback
                    audio_path = self._synthesize_telugu_gtts(text)
                    success = False
                    if audio_path:
                        success = self._play_audio_file(audio_path)

                    if not success and speaker is not None:
                        # Fallback to SAPI
                        try:
                            speaker.Speak(text, 0)
                        except Exception:
                            pass
                else:
                    # English / default speech via Windows SAPI
                    if speaker is not None:
                        try:
                            speaker.Speak(text, 0)
                        except Exception as e:
                            print(f"[Speech Speak Error] {e}")
                    else:
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

    def speak(self, text: str, lang: str = "te"):
        """Enqueue speech without blocking caller."""
        if not text or not text.strip():
            return
        try:
            if self.queue.full():
                try:
                    self.queue.get_nowait()
                except queue.Empty:
                    pass
            self.queue.put_nowait((text.strip(), lang))
        except Exception:
            pass

    def process_recognition(
        self,
        gesture_name: str,
        speech_text: str,
        confidence: float,
        language: str = "te"
    ) -> Tuple[bool, str]:
        """
        Applies duplicate prevention, cooldown, and speaks in fluent Telugu or English.
        Returns (was_spoken, spoken_phrase).
        """
        if confidence < self.confidence_threshold:
            return False, ""

        if not gesture_name or gesture_name.upper() == "UNKNOWN":
            return False, ""

        if not speech_text or not speech_text.strip():
            return False, ""

        # Determine utterance based on language
        if language == "te":
            utterance = self.to_fluent_telugu(gesture_name, speech_text)
        else:
            utterance = speech_text

        now = time.time()

        # If gesture changed, speak immediately
        if gesture_name != self.last_gesture:
            self.last_gesture = gesture_name
            self.last_speak_time = now
            self.speak(utterance, lang=language)
            return True, utterance

        # If same gesture, repeat after cooldown
        if (now - self.last_speak_time) >= self.speech_cooldown:
            self.last_speak_time = now
            self.speak(utterance, lang=language)
            return True, utterance

        return False, utterance

    def reset_state(self):
        """Reset history on session stop/start."""
        self.last_gesture = None
        self.last_speak_time = 0.0