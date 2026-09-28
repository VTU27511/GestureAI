import os
import time
import queue
import hashlib
import base64
import asyncio
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

# Comprehensive offline multilingual dictionary
OFFLINE_TRANSLATIONS = {
    # Pronouns & Pointing
    "YOU": {"te": "మీరు", "ta": "நீங்கள்"},
    "ME": {"te": "నేను", "ta": "நான்"},
    "I": {"te": "నేను", "ta": "நான்"},
    "WE": {"te": "మేము", "ta": "நாங்கள்"},
    "US": {"te": "మనం", "ta": "நாம்"},
    "HE": {"te": "అతను", "ta": "அவர்"},
    "SHE": {"te": "ఆమె", "ta": "அவள்"},
    "THEY": {"te": "వారు", "ta": "அவர்கள்"},
    "IT": {"te": "ఇది", "ta": "இது"},
    "MY": {"te": "నాది", "ta": "என்னுடையது"},
    "YOUR": {"te": "మీది", "ta": "உங்களுடையது"},
    "POINT": {"te": "అదిగో అక్కడ", "ta": "அங்கே பாருங்கள்"},
    "POINTING": {"te": "అదిగో అక్కడ", "ta": "அங்கே பாருங்கள்"},

    # Greetings & Common Expressions
    "HELLO": {"te": "నమస్కారం! బాగున్నారా?", "ta": "வணக்கம்! எப்படி இருக்கிறீர்கள்?"},
    "HI": {"te": "నమస్కారం! ఎలా ఉన్నారు?", "ta": "வணக்கம்! நலமா?"},
    "NAMASTE": {"te": "నమస్కారం, అందరికీ శుభోదయం!", "ta": "வணக்கம், அனைவருக்கும் இனிய காலை வணக்கம்!"},
    "NAMASKARAM": {"te": "నమస్కారం!", "ta": "வணக்கம்!"},
    "GOOD MORNING": {"te": "శుభోదయం!", "ta": "இனிய காலை வணக்கம்!"},
    "GOOD NIGHT": {"te": "శుభరాత్రి!", "ta": "இனிய இரவு வணக்கம்!"},
    "WELCOME": {"te": "స్వాగతం!", "ta": "வரவேற்கிறோம்!"},
    "BYE": {"te": "వెళ్ళి వస్తాను!", "ta": "போய் வருகிறேன்!"},
    "SEE YOU": {"te": "మళ్ళీ కలుద్దాం!", "ta": "மீண்டும் சந்திப்போம்!"},

    # Actions & Verbs
    "COME": {"te": "ఇక్కడికి రండి", "ta": "இங்கே வாருங்கள்"},
    "GO": {"te": "వెళ్ళండి", "ta": "போங்கள்"},
    "STOP": {"te": "దయచేసి ఆగండి", "ta": "தயவுசெய்து நில்லுங்கள்"},
    "WAIT": {"te": "కాసేపు ఆగండి", "ta": "காத்திருங்கள்"},
    "EAT": {"te": "ఆహారం తినండి", "ta": "சாப்பிடுங்கள்"},
    "DRINK": {"te": "మంచి నీళ్లు తాగండి", "ta": "தண்ணீர் குடியுங்கள்"},
    "SLEEP": {"te": "నిద్రపోండి", "ta": "தூங்குங்கள்"},
    "READ": {"te": "చదవండి", "ta": "படியுங்கள்"},
    "BOOK_READ": {"te": "నేను పుస్తకం చదువుతున్నాను", "ta": "நான் புத்தகம் படித்துக் கொண்டிருக்கிறேன்"},
    "WRITE": {"te": "రాయండి", "ta": "எழுதுங்கள்"},
    "CALL": {"te": "దయచేసి నాకు ఫోన్ చేయండి", "ta": "தயவுசெய்து எனக்கு போன் செய்யுங்கள்"},
    "HELP": {"te": "దయచేసి సహాయం చేయండి", "ta": "தயவுசெய்து எனக்கு உதவுங்கள்"},
    "WORK": {"te": "పని చేయండి", "ta": "வேலை செய்யுங்கள்"},
    "LOVE": {"te": "ప్రేమ", "ta": "அன்பு"},
    "I LOVE YOU": {"te": "నేను నిన్ను ప్రేమిస్తున్నాను", "ta": "நான் உன்னை நேசிக்கிறேன்"},

    # Approvals & Responses
    "YES": {"te": "అవును, నిజమే", "ta": "ஆம், உண்மைதான்"},
    "NO": {"te": "లేదు, కాదు", "ta": "இல்லை, தவறானது"},
    "OK": {"te": "నేను బాగున్నాను మిత్రమా, అంతా సవ్యంగా ఉంది", "ta": "நான் நன்றாக இருக்கிறேன் நண்பா, எல்லாம் சரி"},
    "OKAY": {"te": "సరే, అంతా బాగుంది", "ta": "சரி, எல்லாம் நன்றாக உள்ளது"},
    "I AM OK BUDDY": {"te": "నేను బాగున్నాను మిత్రమా, ధన్యవాదాలు", "ta": "நான் நலமாக இருக்கிறேன் நண்பா, நன்றி"},
    "THANK YOU": {"te": "చాలా ధన్యవాదాలు!", "ta": "மிக்க நன்றி!"},
    "THANKS": {"te": "ధన్యవాదాలు!", "ta": "நன்றி!"},
    "SORRY": {"te": "నన్ను క్షమించండి", "ta": "என்னை மன்னியுங்கள்"},
    "PLEASE": {"te": "దయచేసి", "ta": "தயவுசெய்து"},
    "SUPER": {"te": "చాలా అద్భుతంగా ఉంది, సూపర్!", "ta": "மிகச் சிறப்பானது, சூப்பர்!"},
    "GREAT": {"te": "చాలా గొప్పగా ఉంది!", "ta": "மிகச் சிறப்பாக உள்ளது!"},
    "GREAT JOB!": {"te": "చాలా గొప్పగా చేసారు, అద్భుతం!", "ta": "மிகச் சிறப்பான வேலை, அற்புதம்!"},
    "LIKE": {"te": "చాలా బాగుంది, నాకు నచ్చింది", "ta": "மிகவும் நன்றாக இருக்கிறது, எனக்கு பிடித்திருக்கிறது"},
    "DISLIKE": {"te": "నాకు ఇది నచ్చలేదు", "ta": "எனக்கு இது பிடிக்கவில்லை"},
    "BAD": {"te": "బాగాలేదు", "ta": "மோசமானது"},
    "PEACE": {"te": "శాంతి మరియు విజయం లభించుగాక", "ta": "அமைதி மற்றும் வெற்றி உண்டாகட்டும்"},
    "VICTORY": {"te": "విజయం!", "ta": "வெற்றி!"},
    "THUMBS_UP": {"te": "చాలా బాగుంది, విజయం!", "ta": "மிகச் சிறப்பானது, வெற்றி!"},
    "THUMPSUP": {"te": "చాలా బాగుంది, విజయం!", "ta": "மிகச் சிறப்பானது, வெற்றி!"},
    "GUN": {"te": "తుపాకీ సంజ్ఞ", "ta": "துப்பாக்கி சைகை"},

    # Needs & Everyday Objects
    "WATER": {"te": "నాకు త్రాగడానికి మంచి నీళ్లు కావాలి", "ta": "எனக்கு குடிக்க தண்ணீர் வேண்டும்"},
    "FOOD": {"te": "నాకు ఆకలిగా ఉంది, ఆహారం కావాలి", "ta": "எனக்கு பசிக்கிறது, உணவு வேண்டும்"},
    "TEA": {"te": "నాకు టీ కావాలి", "ta": "எனக்கு டீ வேண்டும்"},
    "COFFEE": {"te": "నాకు కాఫీ కావాలి", "ta": "எனக்கு காபி வேண்டும்"},
    "HOLDING_CUP": {"te": "టీ లేదా కాఫీ తాగుతున్నాను", "ta": "காபி அல்லது டீ அருந்துகிறேன்"},
    "MOBILE": {"te": "మొబైల్ ఫోన్", "ta": "மொபைல் போன்"},
    "PHONE": {"te": "ఫోన్", "ta": "தொலைபேசி"},
    "WHATSAPP": {"te": "వాట్సాప్ సందేశం పంపండి", "ta": "வாட்ஸ்அப் செய்தி அனுப்புங்கள்"},
    "WHATSAPP RANJITH": {"te": "వాట్సాప్ రంజిత్, సందేశం పంపండి", "ta": "வாட்ஸ்அப் ரஞ்சித், செய்தி அனுப்புங்கள்"},
    "MONEY": {"te": "డబ్బులు", "ta": "பணம்"},
    "TIME": {"te": "సమయం ఎంత?", "ta": "நேரம் என்ன?"},
    "MEDICINE": {"te": "మందులు కావాలి", "ta": "மருந்து வேண்டும்"},
    "HOSPITAL": {"te": "ఆసుపత్రి", "ta": "மருத்துவமனை"},
    "DOCTOR": {"te": "వైద్యుడు", "ta": "மருத்துவர்"},
    "PAIN": {"te": "చాలా నొప్పిగా ఉంది", "ta": "ரொம்ப வலிக்கிறது"},
    "DANGER": {"te": "ప్రమాదం, జాగ్రత్త!", "ta": "ஆபத்து, எச்சரிக்கை!"},

    # Feelings
    "HAPPY": {"te": "చాలా సంతోషంగా ఉంది", "ta": "ரொம்ப மகிழ்ச்சியாக இருக்கிறது"},
    "SAD": {"te": "బాధగా ఉంది", "ta": "வருத்தமாக இருக்கிறது"},
    "TIRED": {"te": "అలసటగా ఉంది", "ta": "களைப்பாக இருக்கிறது"},
    "ANGRY": {"te": "కోపంగా ఉంది", "ta": "கோபமாக இருக்கிறது"},

    # Custom & Party Gestures
    "TDP": {"te": "తెలుగుదేశం పార్టీ సంజ్ఞ", "ta": "தெலுங்கு தேசம் கட்சி சைகை"},
    "JAGAN": {"te": "జగన్ సంజ్ఞ", "ta": "ஜெகன் சைகை"},
    "FUCK YOU": {"te": "కోపంతో కూడిన సంజ్ఞ", "ta": "கோபமான சைகை"},
}

# Neural Edge-TTS voice models for Female & Male in each language
NEURAL_VOICES = {
    ("te", "female"): "te-IN-ShrutiNeural",
    ("te", "male"): "te-IN-MohanNeural",
    ("ta", "female"): "ta-IN-PallaviNeural",
    ("ta", "male"): "ta-IN-ValluvarNeural",
    ("en", "female"): "en-IN-NeerjaNeural",
    ("en", "male"): "en-IN-PrabhatNeural",
}

class SpeechEngine:
    """
    Multilingual, Multi-Gender Speech Engine.
    Supports Telugu, Tamil, and English with dedicated Male and Female neural voices.
    Provides automatic translation, disk caching, browser base64 streaming, and native audio playback.
    """
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.speech_cooldown = float(os.getenv("SPEECH_COOLDOWN", "1.8"))
        self.confidence_threshold = float(os.getenv("CONFIDENCE_THRESHOLD", "0.65"))
        self.default_language = os.getenv("DEFAULT_LANGUAGE", "te")
        self.default_gender = "female"

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
        """Converts any gesture or text into pure, fluent Telugu."""
        if self.is_telugu_script(speech_text):
            return speech_text

        clean_g = (gesture_name or "").strip().upper()
        clean_s = (speech_text or "").strip().upper()

        # 1. Exact match in dictionary
        if clean_g in OFFLINE_TRANSLATIONS and "te" in OFFLINE_TRANSLATIONS[clean_g]:
            return OFFLINE_TRANSLATIONS[clean_g]["te"]
        if clean_s in OFFLINE_TRANSLATIONS and "te" in OFFLINE_TRANSLATIONS[clean_s]:
            return OFFLINE_TRANSLATIONS[clean_s]["te"]

        # 2. Substring matching
        combined = f"{clean_g} {clean_s}"
        if "YOU" in combined:
            return "మీరు"
        if "ME" in combined or "MYSELF" in combined:
            return "నేను"
        if "HELLO" in combined or "HI" in combined:
            return "నమస్కారం! బాగున్నారా?"
        if "NAMASTE" in combined or "NAMASKARAM" in combined:
            return "నమస్కారం, శుభోదయం!"
        if "THANK" in combined:
            return "చాలా ధన్యవాదాలు!"
        if "OK" in combined:
            return "అంతా బాగుంది, సరే!"
        if "WHATSAPP" in combined:
            return "వాట్సాప్ సందేశం పంపండి."
        if "PEACE" in combined or "VICTORY" in combined:
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

        # 3. Dynamic translation fallback via deep_translator
        try:
            from deep_translator import GoogleTranslator
            res = GoogleTranslator(source="auto", target="te").translate(clean_g or clean_s)
            if res and self.is_telugu_script(res):
                return res
        except Exception:
            pass

        return speech_text or gesture_name

    def to_fluent_tamil(self, gesture_name: str, speech_text: str) -> str:
        """Converts any gesture or text into pure, fluent Tamil."""
        if self.is_tamil_script(speech_text):
            return speech_text

        clean_g = (gesture_name or "").strip().upper()
        clean_s = (speech_text or "").strip().upper()

        # 1. Exact match in dictionary
        if clean_g in OFFLINE_TRANSLATIONS and "ta" in OFFLINE_TRANSLATIONS[clean_g]:
            return OFFLINE_TRANSLATIONS[clean_g]["ta"]
        if clean_s in OFFLINE_TRANSLATIONS and "ta" in OFFLINE_TRANSLATIONS[clean_s]:
            return OFFLINE_TRANSLATIONS[clean_s]["ta"]

        # 2. Substring matching
        combined = f"{clean_g} {clean_s}"
        if "YOU" in combined:
            return "நீங்கள்"
        if "ME" in combined or "MYSELF" in combined:
            return "நான்"
        if "HELLO" in combined or "HI" in combined:
            return "வணக்கம்! எப்படி இருக்கிறீர்கள்?"
        if "NAMASTE" in combined or "NAMASKARAM" in combined:
            return "வணக்கம், அனைவருக்கும் காலை வணக்கம்!"
        if "THANK" in combined:
            return "மிக்க நன்றி!"
        if "OK" in combined:
            return "நான் நன்றாக இருக்கிறேன், எல்லாம் சரி!"
        if "WHATSAPP" in combined:
            return "வாட்ஸ்அப் செய்தி அனுப்புங்கள்."
        if "PEACE" in combined or "VICTORY" in combined:
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

        # 3. Dynamic translation fallback via deep_translator
        try:
            from deep_translator import GoogleTranslator
            res = GoogleTranslator(source="auto", target="ta").translate(clean_g or clean_s)
            if res and self.is_tamil_script(res):
                return res
        except Exception:
            pass

        return speech_text or gesture_name

    def to_fluent_phrase(self, gesture_name: str, speech_text: str, language: str = "te") -> str:
        """Returns the natural phrase for the given gesture in the target language."""
        if language == "te":
            return self.to_fluent_telugu(gesture_name, speech_text)
        elif language == "ta":
            return self.to_fluent_tamil(gesture_name, speech_text)
        else:
            return speech_text or gesture_name

    def get_synthesized_audio(
        self,
        text: str,
        lang: str = "te",
        gender: str = "female"
    ) -> Tuple[Optional[str], str]:
        """
        Synthesizes speech via Edge-TTS (Female/Male neural) with gTTS fallback.
        Returns (file_path, base64_data_uri).
        """
        if not text or not text.strip():
            return None, ""

        clean_text = text.strip()
        gender_clean = "male" if gender.lower() == "male" else "female"
        hash_id = hashlib.md5(f"{lang}:{gender_clean}:{clean_text}".encode("utf-8")).hexdigest()
        file_path = os.path.join(self.cache_dir, f"{lang}_{gender_clean}_{hash_id}.mp3")

        # 1. Return cached audio if present
        if not (os.path.exists(file_path) and os.path.getsize(file_path) > 0):
            # 2. Generate with Edge-TTS (Neural Male/Female)
            generated = False
            voice_name = NEURAL_VOICES.get((lang, gender_clean), "te-IN-ShrutiNeural")
            try:
                import edge_tts
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                comm = edge_tts.Communicate(clean_text, voice_name)
                loop.run_until_complete(comm.save(file_path))
                loop.close()
                if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
                    generated = True
            except Exception as e:
                print(f"[Edge-TTS Synthesis Fallback ({lang}, {gender_clean})] {e}")

            # 3. Fallback: gTTS
            if not generated:
                try:
                    from gtts import gTTS
                    tts = gTTS(text=clean_text, lang=lang, slow=False)
                    tts.save(file_path)
                except Exception as e:
                    print(f"[gTTS Fallback Error] {e}")
                    return None, ""

        # 4. Read and encode base64 for browser playback
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
            time.sleep(0.08)
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
        """Background worker thread: plays speech asynchronously on host speaker."""
        while True:
            try:
                item = self.queue.get()
                if not item:
                    self.queue.task_done()
                    continue

                text, lang, gender = item
                audio_path, _ = self.get_synthesized_audio(text, lang=lang, gender=gender)
                if audio_path:
                    self._play_audio_file(audio_path)

                self.queue.task_done()
            except Exception as e:
                print(f"[Speech Worker Exception] {e}")

    def speak(self, text: str, lang: str = "te", gender: str = "female"):
        """Enqueue speech on host system without blocking."""
        if not text or not text.strip():
            return
        try:
            if self.queue.full():
                try:
                    self.queue.get_nowait()
                except queue.Empty:
                    pass
            self.queue.put_nowait((text.strip(), lang, gender))
        except Exception:
            pass

    def process_recognition(
        self,
        gesture_name: str,
        speech_text: str,
        confidence: float,
        language: str = "te",
        gender: str = "female"
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
        audio_path, audio_b64 = self.get_synthesized_audio(utterance, lang=language, gender=gender)

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