from abc import ABC, abstractmethod
from typing import List, Dict


class LLMProvider(ABC):
    @abstractmethod
    async def chat(
        self,
        system_prompt: str,
        history: List[Dict[str, str]],
        user_message: str,
    ) -> str: ...
