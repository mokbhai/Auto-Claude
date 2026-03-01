"""
Insights API Router
===================

Handles AI-powered insights chat operations.
Maps IPC channels: INSIGHTS_*
"""

from datetime import datetime
from typing import Any, Optional
from enum import Enum

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


# ============================================
# Data Models
# ============================================


class MessageRole(str, Enum):
    """Message role enum."""

    USER = "user"
    ASSISTANT = "assistant"


class ChatMessage(BaseModel):
    """Chat message model."""

    id: str
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class InsightsSession(BaseModel):
    """Insights session model."""

    id: str
    projectId: str
    title: str
    messages: list[ChatMessage] = []
    model: str | None = None
    thinkingLevel: str = "medium"
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
    isArchived: bool = False


class ModelConfig(BaseModel):
    """Model configuration."""

    model: str | None = None
    thinkingLevel: str = "medium"


# ============================================
# In-Memory Store
# ============================================

_sessions: dict[str, InsightsSession] = {}
_session_counter = 0


def _generate_session_id() -> str:
    """Generate a unique session ID."""
    global _session_counter
    _session_counter += 1
    return f"insights-{_session_counter}"


# ============================================
# Session Operations
# ============================================


@router.get("/sessions", response_model=dict[str, Any])
async def list_sessions(project_id: str | None = None) -> dict[str, Any]:
    """List all insights sessions."""
    sessions = list(_sessions.values())
    if project_id:
        sessions = [s for s in sessions if s.projectId == project_id]
    # Don't return archived sessions by default
    sessions = [s for s in sessions if not s.isArchived]
    return {"success": True, "data": sessions}


@router.get("/sessions/{session_id}", response_model=dict[str, Any])
async def get_session(session_id: str) -> dict[str, Any]:
    """Get a specific insights session."""
    session = _sessions.get(session_id)
    if not session:
        return {"success": False, "error": "Session not found"}
    return {"success": True, "data": session}


@router.post("/sessions", response_model=dict[str, Any])
async def create_session(project_id: str, title: str | None = None) -> dict[str, Any]:
    """Create a new insights session."""
    session = InsightsSession(
        id=_generate_session_id(),
        projectId=project_id,
        title=title or f"Insights {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
    )
    _sessions[session.id] = session
    return {"success": True, "data": session}


@router.post("/sessions/{session_id}/clear", response_model=dict[str, Any])
async def clear_session(session_id: str) -> dict[str, Any]:
    """Clear messages in a session."""
    session = _sessions.get(session_id)
    if not session:
        return {"success": False, "error": "Session not found"}
    session.messages = []
    session.updatedAt = datetime.utcnow()
    return {"success": True}


@router.delete("/sessions/{session_id}", response_model=dict[str, Any])
async def delete_session(session_id: str) -> dict[str, Any]:
    """Delete a session."""
    if session_id in _sessions:
        del _sessions[session_id]
        return {"success": True}
    return {"success": False, "error": "Session not found"}


@router.post("/sessions/delete-batch", response_model=dict[str, Any])
async def delete_sessions(session_ids: list[str]) -> dict[str, Any]:
    """Delete multiple sessions."""
    for session_id in session_ids:
        _sessions.pop(session_id, None)
    return {"success": True}


@router.post("/sessions/{session_id}/archive", response_model=dict[str, Any])
async def archive_session(session_id: str) -> dict[str, Any]:
    """Archive a session."""
    session = _sessions.get(session_id)
    if not session:
        return {"success": False, "error": "Session not found"}
    session.isArchived = True
    session.updatedAt = datetime.utcnow()
    return {"success": True}


@router.post("/sessions/archive-batch", response_model=dict[str, Any])
async def archive_sessions(session_ids: list[str]) -> dict[str, Any]:
    """Archive multiple sessions."""
    for session_id in session_ids:
        session = _sessions.get(session_id)
        if session:
            session.isArchived = True
            session.updatedAt = datetime.utcnow()
    return {"success": True}


@router.post("/sessions/{session_id}/unarchive", response_model=dict[str, Any])
async def unarchive_session(session_id: str) -> dict[str, Any]:
    """Unarchive a session."""
    session = _sessions.get(session_id)
    if not session:
        return {"success": False, "error": "Session not found"}
    session.isArchived = False
    session.updatedAt = datetime.utcnow()
    return {"success": True}


@router.patch("/sessions/{session_id}/rename", response_model=dict[str, Any])
async def rename_session(session_id: str, title: str) -> dict[str, Any]:
    """Rename a session."""
    session = _sessions.get(session_id)
    if not session:
        return {"success": False, "error": "Session not found"}
    session.title = title
    session.updatedAt = datetime.utcnow()
    return {"success": True}


@router.patch("/sessions/{session_id}/model-config", response_model=dict[str, Any])
async def update_model_config(session_id: str, config: ModelConfig) -> dict[str, Any]:
    """Update model configuration for a session."""
    session = _sessions.get(session_id)
    if not session:
        return {"success": False, "error": "Session not found"}
    session.model = config.model
    session.thinkingLevel = config.thinkingLevel
    session.updatedAt = datetime.utcnow()
    return {"success": True}


@router.post("/sessions/{session_id}/switch", response_model=dict[str, Any])
async def switch_session(session_id: str) -> dict[str, Any]:
    """Switch to a different session."""
    session = _sessions.get(session_id)
    if not session:
        return {"success": False, "error": "Session not found"}
    return {"success": True, "data": session}


# ============================================
# Chat Operations
# ============================================


@router.post("/sessions/{session_id}/messages", response_model=dict[str, Any])
async def send_message(session_id: str, content: str) -> dict[str, Any]:
    """Send a message and get AI response."""
    session = _sessions.get(session_id)
    if not session:
        return {"success": False, "error": "Session not found"}

    # Add user message
    user_message = ChatMessage(
        id=f"msg-{len(session.messages) + 1}",
        role=MessageRole.USER,
        content=content,
    )
    session.messages.append(user_message)

    # TODO: Implement actual AI response
    assistant_message = ChatMessage(
        id=f"msg-{len(session.messages) + 1}",
        role=MessageRole.ASSISTANT,
        content="I'm a placeholder response. The actual AI integration is not yet implemented.",
    )
    session.messages.append(assistant_message)

    session.updatedAt = datetime.utcnow()

    return {"success": True, "data": assistant_message}


@router.post("/sessions/{session_id}/create-task", response_model=dict[str, Any])
async def create_task_from_insight(session_id: str, message_id: str) -> dict[str, Any]:
    """Create a task from an insight message."""
    session = _sessions.get(session_id)
    if not session:
        return {"success": False, "error": "Session not found"}

    # TODO: Implement actual task creation
    return {
        "success": True,
        "data": {
            "id": f"task-{datetime.utcnow().timestamp()}",
            "projectId": session.projectId,
        },
    }
