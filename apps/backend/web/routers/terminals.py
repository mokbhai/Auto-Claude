"""
Terminals API Router
====================

Handles terminal operations via REST and WebSocket.
Maps IPC channels: TERMINAL_*
"""

import asyncio
import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel

from ..app import get_pty_manager, get_event_bus
from ..services.event_bus import EventType

router = APIRouter()


# ============================================
# Data Models
# ============================================


class TerminalCreate(BaseModel):
    """Model for creating a terminal."""

    cwd: str | None = None
    cols: int = 80
    rows: int = 24
    env: dict[str, str] | None = None
    shell: str | None = None
    name: str | None = None


class TerminalInput(BaseModel):
    """Model for terminal input."""

    data: str


class TerminalResize(BaseModel):
    """Model for terminal resize."""

    cols: int
    rows: int


class TerminalSession(BaseModel):
    """Terminal session model."""

    id: str
    title: str
    cwd: str
    cols: int
    rows: int
    worktreePath: str | None = None
    worktreeBranch: str | None = None
    hasPendingResume: bool = False


class WorktreeCreate(BaseModel):
    """Model for creating a terminal worktree."""

    branchName: str
    basePath: str | None = None


# ============================================
# Terminal CRUD Operations
# ============================================


@router.post("", response_model=dict[str, Any])
async def create_terminal(create_data: TerminalCreate) -> dict[str, Any]:
    """Create a new terminal session."""
    pty_manager = get_pty_manager()

    session = await pty_manager.create_terminal(
        cwd=create_data.cwd,
        cols=create_data.cols,
        rows=create_data.rows,
        env=create_data.env,
        shell=create_data.shell,
    )

    return {
        "success": True,
        "data": TerminalSession(
            id=session.id,
            title=create_data.name or session.title,
            cwd=session.cwd,
            cols=session.cols,
            rows=session.rows,
        ),
    }


@router.delete("/{terminal_id}", response_model=dict[str, Any])
async def destroy_terminal(terminal_id: str) -> dict[str, Any]:
    """Destroy a terminal session."""
    pty_manager = get_pty_manager()
    success = await pty_manager.destroy_terminal(terminal_id)
    return {"success": success}


@router.get("", response_model=dict[str, Any])
async def get_sessions() -> dict[str, Any]:
    """Get all active terminal sessions."""
    pty_manager = get_pty_manager()
    sessions = pty_manager.get_sessions()

    return {
        "success": True,
        "data": [
            TerminalSession(
                id=s.id,
                title=s.title,
                cwd=s.cwd,
                cols=s.cols,
                rows=s.rows,
                worktreePath=s.worktree_path,
                worktreeBranch=s.worktree_branch,
            )
            for s in sessions
        ],
    }


# ============================================
# Terminal I/O Operations
# ============================================


@router.post("/{terminal_id}/input", response_model=dict[str, Any])
async def send_input(terminal_id: str, input_data: TerminalInput) -> dict[str, Any]:
    """Send input to a terminal."""
    pty_manager = get_pty_manager()
    success = await pty_manager.write_input(terminal_id, input_data.data)
    return {"success": success}


@router.post("/{terminal_id}/resize", response_model=dict[str, Any])
async def resize_terminal(terminal_id: str, resize_data: TerminalResize) -> dict[str, Any]:
    """Resize a terminal."""
    pty_manager = get_pty_manager()
    success = await pty_manager.resize_terminal(
        terminal_id, resize_data.cols, resize_data.rows
    )
    return {"success": success}


@router.post("/{terminal_id}/title", response_model=dict[str, Any])
async def set_title(terminal_id: str, title: str) -> dict[str, Any]:
    """Set terminal title."""
    pty_manager = get_pty_manager()
    success = pty_manager.set_title(terminal_id, title)
    return {"success": success}


# ============================================
# Worktree Operations
# ============================================


@router.post("/{terminal_id}/worktree", response_model=dict[str, Any])
async def create_terminal_worktree(
    terminal_id: str, worktree_data: WorktreeCreate
) -> dict[str, Any]:
    """Create a worktree for a terminal."""
    # TODO: Implement worktree creation
    return {
        "success": True,
        "data": {
            "path": f"/tmp/worktree-{terminal_id}",
            "branch": worktree_data.branchName,
        },
    }


@router.get("/{terminal_id}/worktree", response_model=dict[str, Any])
async def get_terminal_worktree(terminal_id: str) -> dict[str, Any]:
    """Get worktree info for a terminal."""
    pty_manager = get_pty_manager()
    session = pty_manager.get_session(terminal_id)

    if not session:
        return {"success": False, "error": "Terminal not found"}

    return {
        "success": True,
        "data": {
            "path": session.worktree_path,
            "branch": session.worktree_branch,
        },
    }


@router.delete("/{terminal_id}/worktree", response_model=dict[str, Any])
async def remove_terminal_worktree(terminal_id: str) -> dict[str, Any]:
    """Remove worktree from a terminal."""
    pty_manager = get_pty_manager()
    success = pty_manager.set_worktree_config(terminal_id, None, None)
    return {"success": success}


@router.post("/{terminal_id}/worktree-config", response_model=dict[str, Any])
async def set_worktree_config(
    terminal_id: str,
    worktree_path: str | None = None,
    worktree_branch: str | None = None,
) -> dict[str, Any]:
    """Set worktree configuration for a terminal."""
    pty_manager = get_pty_manager()
    success = pty_manager.set_worktree_config(
        terminal_id, worktree_path, worktree_branch
    )
    return {"success": success}


# ============================================
# WebSocket Endpoint for Terminal I/O
# ============================================


@router.websocket("/ws/{terminal_id}")
async def terminal_websocket(
    websocket: WebSocket,
    terminal_id: str,
):
    """
    WebSocket endpoint for terminal I/O.

    Message format (client -> server):
    - {"type": "input", "data": "..."} - Send input to terminal
    - {"type": "resize", "cols": 80, "rows": 24} - Resize terminal

    Message format (server -> client):
    - {"type": "output", "data": "..."} - Terminal output
    - {"type": "exit", "code": 0} - Terminal exited
    """
    await websocket.accept()

    pty_manager = get_pty_manager()
    event_bus = get_event_bus()

    # Check if terminal exists
    session = pty_manager.get_session(terminal_id)
    if not session:
        await websocket.send_json({"type": "error", "message": "Terminal not found"})
        await websocket.close()
        return

    # Subscribe to terminal events
    async def on_terminal_event(event):
        if event.terminal_id == terminal_id:
            if event.event_type == EventType.TERMINAL_OUTPUT:
                await websocket.send_json({"type": "output", "data": event.data})
            elif event.event_type == EventType.TERMINAL_EXIT:
                await websocket.send_json({"type": "exit", "code": event.data.get("exitCode", 0)})

    try:
        while True:
            # Receive message from client
            message = await websocket.receive_text()
            data = json.loads(message)

            msg_type = data.get("type")

            if msg_type == "input":
                # Send input to terminal
                await pty_manager.write_input(terminal_id, data.get("data", ""))

            elif msg_type == "resize":
                # Resize terminal
                cols = data.get("cols", 80)
                rows = data.get("rows", 24)
                await pty_manager.resize_terminal(terminal_id, cols, rows)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
    finally:
        # Don't destroy terminal on WebSocket disconnect - allow reconnection
        pass


# ============================================
# Session Persistence Operations
# ============================================


@router.get("/dates", response_model=dict[str, Any])
async def get_session_dates() -> dict[str, Any]:
    """Get dates with terminal sessions."""
    # TODO: Implement session date retrieval from persistence
    return {"success": True, "data": []}


@router.get("/for-date/{date}", response_model=dict[str, Any])
async def get_sessions_for_date(date: str) -> dict[str, Any]:
    """Get terminal sessions for a specific date."""
    # TODO: Implement session retrieval by date
    return {"success": True, "data": []}


@router.post("/restore/{session_id}", response_model=dict[str, Any])
async def restore_session(session_id: str) -> dict[str, Any]:
    """Restore a terminal session."""
    # TODO: Implement session restoration
    return {"success": False, "error": "Session not found"}


@router.delete("/sessions", response_model=dict[str, Any])
async def clear_sessions() -> dict[str, Any]:
    """Clear all terminal sessions."""
    # TODO: Implement session clearing
    return {"success": True}
