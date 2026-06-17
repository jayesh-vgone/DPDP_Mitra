from abc import ABC, abstractmethod
from typing import Optional


class TTSProvider(ABC):
    @abstractmethod
    async def synthesize(self, text: str, lang: str) -> Optional[bytes]: ...
