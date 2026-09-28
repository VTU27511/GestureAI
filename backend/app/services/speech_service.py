import os
import time
import queue
import hashlib
import base64
import threading
from typing import Optional, Tuple
from collections import namedtuple

try:
    import pygame
except Exception:
    pygame = None

class SpeechResult(tuple):
    """
    Dual compatibility:
    - Acts as a 2-tuple (was_spoken, spoken_phrase) for existing code and tests.
    - Has attributes .was_spoken, .spoken_phrase, .audio_base64.
    - Compares directly to boolean (res == True).
    """
    def __new__(cls, was_spoken: bool, spoken_phrase: str, audio_base64: str = ""):
        obj = super().__new__(cls, (was_spoken, spoken_phrase))
        obj.was_spoken = was_spoken
        obj.spoken_phrase = spoken_phrase
        obj.audio_base64 = audio_base64
        return obj

    def __bool__(self):
        return self.was_spoken

    def __eq__(self, other):
        if isinstance(other, bool):
            return self.was_spoken == other
        return super().__eq__(other)

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
    "BOOK_READ": "నేను పుస్తకం చదువుతున్నాను.",
    "HOLDING_CUP": "కాఫీ లేదా టీ తాగుతున్నాను.",
    "GOOD MORNING": "శుభోదయం!",
    "GOOD NIGHT": "శుభరాత్రి, ప్రశాంతంగా నిద్రించండి.",
}

TAMIL_PHRASEBOOK = {
    "HELLO": "வணக்கம்! எப்படி இருக்கிறீர்கள்?",
    "HELLO! NICE TO MEET YOU.": "வணக்கம்! உங்களை சந்தித்ததில் மிக்க மகிழ்ச்சி.",
    "HI": "வணக்கம்! நலமா?",
    "NAMASTE": "வணக்கம், அனைவருக்கும் இனிய காலை வணக்கம்!",
    "OK": "நான் நன்றாக இருக்கிறேன் நண்பா, எல்லாம் சரி.",
    "OKAY": "சரி, எல்லாம் நன்றாக உள்ளது.",
    "I AM OK BUDDY": "நான் நலமாக இருக்கிறேன் நண்பா, நன்றி.",
    "THANK YOU": "மிக்க நன்றி!",
    "THANKS": "நன்றி!",
    "DISLIKE": "எனக்கு இது பிடிக்கவில்லை.",
    "LIKE": "மிகவும் நன்றாக இருக்கிறது, எனக்கு பிடித்திருக்கிறது.",
    "SUPER": "மிகச் சிறப்பானது, சூப்பர்!",
    "GREAT JOB!": "மிகச் சிறப்பான வேலை, அற்புதம்!",
    "PEACE": "அமைதி மற்றும் வெற்றி உண்டாகட்டும்.",
    "STOP": "தயவுசெய்து இங்கே நில்லுங்கள்.",
    "WHATSAPP": "வாட்ஸ்அப் செய்தி அனுப்புங்கள்.",
    "WHATSAPP RANJITH": "வாட்ஸ்அப் ரஞ்சித், செய்தி அனுப்புங்கள்.",
    "YES": "ஆம், உண்மைதான்.",
    "NO": "இல்லை, தவறானது.",
    "HELP": "தயவுசெய்து எனக்கு உதவுங்கள்.",
    "WATER": "எனக்கு குடிக்க தண்ணீர் வேண்டும்.",
    "FOOD": "எனக்கு பசிக்கிறது, உணவு வேண்டும்.",
    "CALL": "தயவுசெய்து எனக்கு போன் செய்யுங்கள்.",
    "BOOK_READ": "நான் புத்தகம் படித்துக் கொண்டிருக்கிறேன்.",
    "HOLDING_CUP": "காபி அல்லது டீ அருந்துகிறேன்.",
    "GOOD MORNING": "இனிய காலை வணக்கம்!",
    "GOOD NIGHT": "இனிய இரவு வணக்கம், இனிதாக உறங்குங்கள்.",
}

class SpeechEngine:
    """
    Multilingual Speech Engine supporting fluent Telugu, Tamil, and English.
    Provides gTTS synthesis, audio caching, base64 payload streaming for browsers,
    and native Windows/Pygame audio playback.
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

        if pygame is not None:
            try:
                pygame.init()
                if not pygame.mixer.get_init():
                    pygame.mixer.init()
            except Exception as e:
                print(f"[Pygame Init Warning] {e}")

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

    @staticmethod
    def is_tamil_script(text: str) -> bool:
        """Check if string contains native Tamil unicode characters."""
        return any(0x0B80 <= ord(c) <= 0x0BFF for c in text)

    def to_fluent_telugu(self, gesture_name: str, speech_text: str) -> str:
        """Translates or refines gesture text into natural, fluent Telugu."""
        if self.is_telugu_script(speech_text):
            return speech_text

        clean_g = gesture_name.strip().upper()
        clean_s = speech_text.strip().upper()

        if clean_s in TELUGU_PHRASEBOOK:
            return TELUGU_PHRASEBOOK[clean_s]
        if clean_g in TELUGU_PHRASEBOOK:
            return TELUGU_PHRASEBOOK[clean_g]

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

        return speech_text

    def to_fluent_tamil(self, gesture_name: str, speech_text: str) -> str:
        """Translates or refines gesture text into natural, fluent Tamil."""
        if self.is_tamil_script(speech_text):
            return speech_text

        clean_g = gesture_name.strip().upper()
        clean_s = speech_text.strip().upper()

        if clean_s in TAMIL_PHRASEBOOK:
            return TAMIL_PHRASEBOOK[clean_s]
        if clean_g in TAMIL_PHRASEBOOK:
            return TAMIL_PHRASEBOOK[clean_g]

        combined = f"{clean_g} {clean_s}"
        if "HELLO" in combined or "HI" in combined:
            return "வணக்கம்! எப்படி இருக்கிறீர்கள்?"
        if "NAMASTE" in combined:
            return "வணக்கம், அனைவருக்கும் காலை வணக்கம்!"
        if "THANK" in combined:
            return "மிக்க நன்றி!"
        if "OK" in combined:
            return "நான் நன்றாக இருக்கிறேன், எல்லாம் சரி!"
        if "WHATSAPP" in combined:
            return "வாட்ஸ்அப் செய்தி அனுப்புங்கள்."
        if "PEACE" in combined:
            return "அமைதி மற்றும் வெற்றி!"
        if "DISLIKE" in combined:
            return "எனக்கு இது பிடிக்கவில்லை."
        if "LIKE" in combined or "SUPER" in combined or "GREAT" in combined:
            return "மிகச் சிறப்பானது, சூப்பர்!"
        if "STOP" in combined:
            return "தயவுசெய்து நில்லுங்கள்."
        if "HELP" in combined:
            return "தயவுசெய்து உதவுங்கள்."
        if "WATER" in combined:
            return "எனக்கு தண்ணீர் வேண்டும்."
        if "FOOD" in combined:
            return "எனக்கு உணவு வேண்டும்."
        if "CALL" in combined:
            return "தயவுசெய்து போன் செய்யுங்கள்."

        return speech_text

    def to_fluent_phrase(self, gesture_name: str, speech_text: str, language: str = "te") -> str:
        """Returns the natural phrase for the given gesture in the target language."""
        if language == "te":
            return self.to_fluent_telugu(gesture_name, speech_text)
        elif language == "ta":
            return self.to_fluent_tamil(gesture_name, speech_text)
        else:
            return speech_text

    def get_synthesized_audio(self, text: str, lang: str = "te") -> Tuple[Optional[str], str]:
        """
        Synthesizes speech via gTTS and returns (file_path, base64_data_uri).
        Uses disk cache for instantaneous repeated requests.
        """
        if not text or not text.strip():
            return None, ""

        hash_id = hashlib.md5(f"{lang}:{text.strip()}".encode("utf-8")).hexdigest()
        file_path = os.path.join(self.cache_dir, f"{lang}_{hash_id}.mp3")

        if not (os.path.exists(file_path) and os.path.getsize(file_path) > 0):
            try:
                from gtts import gTTS
                tts = gTTS(text=text.strip(), lang=lang, slow=False)
                tts.save(file_path)
            except Exception as e:
                print(f"[gTTS Synthesis Warning ({lang})] {e}")
                return None, ""

        # Encode to base64 for browser playback
        try:
            with open(file_path, "rb") as f:
                b64_str = base64.b64encode(f.read()).decode("utf-8")
            return file_path, f"data:audio/mp3;base64,{b64_str}"
        except Exception as e:
            print(f"[Audio Base64 Error] {e}")
            return file_path, ""

    def _play_audio_file(self, file_path: str):
        """Play synthesized audio file via native Windows Media Player with pygame fallback."""
        if not file_path or not os.path.exists(file_path):
            return False

        abs_path = os.path.abspath(file_path)

        # 1. Native Windows Media Player
        try:
            import pythoncom
            pythoncom.CoInitialize()
            import win32com.client
            wmp = win32com.client.Dispatch("WMPlayer.OCX")
            media = wmp.newMedia(abs_path)
            wmp.currentPlaylist.clear()
            wmp.currentPlaylist.appendItem(media)
            wmp.controls.play()
            time.sleep(0.1)
            return True
        except Exception:
            pass

        # 2. Fallback: Pygame mixer
        if pygame is not None:
            try:
                pygame.init()
                if not pygame.mixer.get_init():
                    pygame.mixer.init()
                pygame.mixer.music.load(abs_path)
                pygame.mixer.music.play()
                while pygame.mixer.music.get_busy():
                    time.sleep(0.04)
                return True
            except Exception:
                pass

        return False

    def _speech_worker(self):
        """Background worker thread: plays speech asynchronously."""
        while True:
            try:
                item = self.queue.get()
                if not item:
                    self.queue.task_done()
                    continue

                text, lang = item
                audio_path, _ = self.get_synthesized_audio(text, lang=lang)
                if audio_path:
                    self._play_audio_file(audio_path)

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
    ) -> SpeechResult:
        """
        Applies duplicate prevention, cooldown, synthesizes speech,
        and returns SpeechResult(was_spoken, spoken_phrase, audio_base64).
        """
        if confidence < self.confidence_threshold:
            return SpeechResult(False, "", "")

        if not gesture_name or gesture_name.upper() == "UNKNOWN":
            return SpeechResult(False, "", "")

        if not speech_text or not speech_text.strip():
            return SpeechResult(False, "", "")

        utterance = self.to_fluent_phrase(gesture_name, speech_text, language=language)
        now = time.time()

        # Generate audio and base64 for browser playback
        audio_path, audio_b64 = self.get_synthesized_audio(utterance, lang=language)

        # If gesture changed, speak immediately
        if gesture_name != self.last_gesture:
            self.last_gesture = gesture_name
            self.last_speak_time = now
            if audio_path:
                self._play_audio_file(audio_path)
            return SpeechResult(True, utterance, audio_b64)

        # If same gesture, repeat after cooldown
        if (now - self.last_speak_time) >= self.speech_cooldown:
            self.last_speak_time = now
            if audio_path:
                self._play_audio_file(audio_path)
            return SpeechResult(True, utterance, audio_b64)

        return SpeechResult(False, utterance, "")

    def reset_state(self):
        """Reset history on session stop/start."""
        self.last_gesture = None
        self.last_speak_time = 0.0