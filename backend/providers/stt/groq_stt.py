import io
from groq import AsyncGroq
from .base import STTProvider

# Groq Whisper language codes
_LANG_MAP = {"en": "en", "hi": "hi"}


class GroqSTT(STTProvider):
    def __init__(self, api_key: str, model: str) -> None:
        self._client = AsyncGroq(api_key=api_key)
        self._model = model

    async def transcribe(self, audio_bytes: bytes, audio_format: str, lang: str) -> str:
        language = _LANG_MAP.get(lang, "en")
        file_obj = io.BytesIO(audio_bytes)
        file_obj.name = f"audio.{audio_format}"

        transcription = await self._client.audio.transcriptions.create(
            file=(f"audio.{audio_format}", file_obj, f"audio/{audio_format}"),
            model=self._model,
            language=language,
            prompt="DPDP Act digital personal data protection",
        )
        return transcription.text.strip()
