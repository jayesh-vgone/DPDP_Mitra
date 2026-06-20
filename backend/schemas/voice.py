from pydantic import BaseModel
from typing import Optional, List, Literal
from schemas.chat import HistoryMessage, MessageOut


class VoiceRequest(BaseModel):
    conversation_id: Optional[str] = None
    audio_base64: str
    audio_format: str = "webm"
    lang: Literal["en", "hi"] = "en"
    history: List[HistoryMessage] = []


class VoiceResponse(BaseModel):
    conversation_id: str
    transcript: str
    message: MessageOut
    audio_base64: Optional[str] = None
    assessment_mode: bool = False
