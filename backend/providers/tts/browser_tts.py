from typing import Optional
from .base import TTSProvider


class BrowserTTS(TTSProvider):
    """Returns None so the frontend falls back to browser SpeechSynthesis."""

    async def synthesize(self, text: str, lang: str) -> Optional[bytes]:
        return None
