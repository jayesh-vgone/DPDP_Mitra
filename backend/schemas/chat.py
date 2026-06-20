from pydantic import BaseModel
from typing import Optional, List, Literal


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    input_type: str
    language: str
    created_at: str


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    lang: Literal["en", "hi"] = "en"
    history: List[HistoryMessage] = []


class ChatResponse(BaseModel):
    conversation_id: str
    message: MessageOut
    audio_base64: Optional[str] = None
    assessment_mode: bool = False
