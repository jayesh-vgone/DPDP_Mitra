from typing import List, Dict
from .base import LLMProvider


class MockLLM(LLMProvider):
    async def chat(
        self,
        system_prompt: str,
        history: List[Dict[str, str]],
        user_message: str,
    ) -> str:
        return (
            f"Under the **Digital Personal Data Protection (DPDP) Act, 2023**, "
            f"regarding your question about '{user_message[:60]}':\n\n"
            f"**Section 4** — Digital personal data may be processed only for a lawful purpose "
            f"for which the Data Principal has given consent.\n\n"
            f"**Section 8(5)** — The Data Fiduciary shall not retain personal data beyond the "
            f"period necessary for the purpose.\n\n"
            f"*(This is a mock response — wire up a real LLM provider for actual answers.)*"
        )
