from abc import ABC, abstractmethod


class STTProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, audio_format: str, lang: str) -> str: ...
