from .base import STTProvider


class MockSTT(STTProvider):
    async def transcribe(self, audio_bytes: bytes, audio_format: str, lang: str) -> str:
        return (
            "DPDP अधिनियम के तहत मेरे डेटा अधिकार क्या हैं?"
            if lang == "hi"
            else "What are my data rights under the DPDP Act?"
        )
