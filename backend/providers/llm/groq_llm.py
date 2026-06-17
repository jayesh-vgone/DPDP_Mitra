from typing import List, Dict
from groq import AsyncGroq
from .base import LLMProvider


class GroqLLM(LLMProvider):
    def __init__(self, api_key: str, model: str) -> None:
        self._client = AsyncGroq(api_key=api_key)
        self._model = model

    async def chat(
        self,
        system_prompt: str,
        history: List[Dict[str, str]],
        user_message: str,
    ) -> str:
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        response = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            max_tokens=1024,
            temperature=0.3,
        )
        return response.choices[0].message.content or ""
