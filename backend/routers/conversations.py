from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from db.pool import get_pool
from db import queries
from middleware.session import get_session_user

router = APIRouter()


class ConversationOut(BaseModel):
    id: str
    user_id: str
    title: str
    language: str
    created_at: str


@router.get("/conversations", response_model=List[ConversationOut])
async def list_conversations(user_id: str = Depends(get_session_user)):
    """Return all conversations for the current user, most recent activity first."""
    pool = get_pool()
    return await queries.list_conversations(pool, user_id)


@router.get("/conversations/{conv_id}/messages", response_model=List[dict])
async def get_messages(conv_id: str, user_id: str = Depends(get_session_user)):
    """Return full message history for one conversation, ordered chronologically."""
    pool = get_pool()
    messages = await queries.list_messages(pool, conv_id, user_id)
    if messages is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return messages
