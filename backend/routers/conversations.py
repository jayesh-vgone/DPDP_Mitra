from typing import List

from fastapi import APIRouter, Request
from pydantic import BaseModel

from db.pool import get_pool
from db import queries

router = APIRouter()


class ConversationOut(BaseModel):
    id: str
    user_id: str
    title: str
    language: str
    created_at: str


@router.get("/conversations", response_model=List[ConversationOut])
async def list_conversations(request: Request):
    """Return all conversations for the current user, most recent activity first."""
    user_id: str = request.state.user_id
    pool = get_pool()
    return await queries.list_conversations(pool, user_id)


@router.get("/conversations/{conv_id}/messages", response_model=List[dict])
async def get_messages(conv_id: str, request: Request):
    """Return full message history for one conversation, ordered chronologically."""
    pool = get_pool()
    return await queries.list_messages(pool, conv_id)
