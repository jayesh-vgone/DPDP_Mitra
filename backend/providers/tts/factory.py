from functools import lru_cache
from config import settings
from .base import TTSProvider
from .browser_tts import BrowserTTS


@lru_cache(maxsize=1)
def get_tts_provider() -> TTSProvider:
    # Phase 2: browser TTS only. Sarvam Bulbul wired in Phase 5.
    return BrowserTTS()
