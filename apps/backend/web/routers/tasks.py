"""
Tasks API Router
================

Handles task management operations.
Maps IPC channels: TASK_*
"""

from datetime import datetime
from typing import Any, Optional
from enum import Enum

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


# ============================================
# Data Models
# ============================================


class TaskStatus(str, Enum):
    """Task status enum."""

    BACKLOG = "backlog"
    PLANNING = "planning"
    READY = "ready"
    IN_PROGRESS = "inProgress"
    REVIEW = "review"
    QA = "qa"
    DONE = "done"
    PAUSED = "paused"
    ERROR = "error"


class Subtask(BaseModel):
    """Subtask model."""

    id: str
    title: str
    description: str = ""
    status: str = "pending"
    order: int = 0


class Task(BaseModel):
    """Task model."""

    id: str
    specId: str
    projectId: str
    title: str
    description: str = ""
    status: TaskStatus = TaskStatus.BACKLOG
    subtasks: list[Subtask] = []
    logs: list[dict[str, Any]] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
    model: str | None = None
    thinkingLevel: str | None = None
    autoCommit: bool = False


class TaskCreate(BaseModel):
    """Model for creating a task."""

    projectId: str
    title: str
    description: str = ""
    model: str | None = None
    thinkingLevel: str | None = None


class TaskUpdate(BaseModel):
    """Model for updating a task."""

    title: str | None = None
    description: str | None = None
    status: TaskStatus | None = None
    model: str | None = None
    thinkingLevel: str | None = None


class WorktreeStatus(BaseModel):
    """Worktree status model."""

    exists: bool
    branch: str | None = None
    hasUncommittedChanges: bool = False
    aheadCount: int = 0
    behindCount: int = 0


# ============================================
# In-Memory Store
# ============================================

_tasks_store: dict[str, Task] = {}
_task_counter = 0


def _generate_task_id() -> str:
    """Generate a unique task ID."""
    global _task_counter
    _task_counter += 1
    return f"task-{_task_counter}"


# ============================================
# Task CRUD Operations
# ============================================


@router.get("", response_model=dict[str, Any])
async def list_tasks(project_id: str | None = None) -> dict[str, Any]:
    """List all tasks, optionally filtered by project."""
    tasks = list(_tasks_store.values())
    if project_id:
        tasks = [t for t in tasks if t.projectId == project_id]
    return {"success": True, "data": tasks}


@router.post("", response_model=dict[str, Any])
async def create_task(task_data: TaskCreate) -> dict[str, Any]:
    """Create a new task."""
    global _task_counter
    _task_counter += 1

    spec_id = f"{_task_counter:03d}"
    task = Task(
        id=_generate_task_id(),
        specId=spec_id,
        projectId=task_data.projectId,
        title=task_data.title,
        description=task_data.description,
        model=task_data.model,
        thinkingLevel=task_data.thinkingLevel,
    )

    _tasks_store[task.id] = task
    return {"success": True, "data": task}


@router.get("/{task_id}", response_model=dict[str, Any])
async def get_task(task_id: str) -> dict[str, Any]:
    """Get a specific task."""
    task = _tasks_store.get(task_id)
    if not task:
        return {"success": False, "error": "Task not found"}
    return {"success": True, "data": task}


@router.patch("/{task_id}", response_model=dict[str, Any])
async def update_task(task_id: str, update_data: TaskUpdate) -> dict[str, Any]:
    """Update a task."""
    task = _tasks_store.get(task_id)
    if not task:
        return {"success": False, "error": "Task not found"}

    update_dict = update_data.model_dump(exclude_none=True)
    for key, value in update_dict.items():
        setattr(task, key, value)
    task.updatedAt = datetime.utcnow()

    return {"success": True, "data": task}


@router.delete("/{task_id}", response_model=dict[str, Any])
async def delete_task(task_id: str) -> dict[str, Any]:
    """Delete a task."""
    if task_id in _tasks_store:
        del _tasks_store[task_id]
        return {"success": True}
    return {"success": False, "error": "Task not found"}


# ============================================
# Task Execution Operations
# ============================================


@router.post("/{task_id}/start", response_model=dict[str, Any])
async def start_task(task_id: str) -> dict[str, Any]:
    """Start executing a task."""
    task = _tasks_store.get(task_id)
    if not task:
        return {"success": False, "error": "Task not found"}

    task.status = TaskStatus.IN_PROGRESS
    task.updatedAt = datetime.utcnow()
    return {"success": True, "data": task}


@router.post("/{task_id}/stop", response_model=dict[str, Any])
async def stop_task(task_id: str) -> dict[str, Any]:
    """Stop a running task."""
    task = _tasks_store.get(task_id)
    if not task:
        return {"success": False, "error": "Task not found"}

    task.status = TaskStatus.PAUSED
    task.updatedAt = datetime.utcnow()
    return {"success": True, "data": task}


@router.post("/{task_id}/review", response_model=dict[str, Any])
async def review_task(task_id: str) -> dict[str, Any]:
    """Move task to review state."""
    task = _tasks_store.get(task_id)
    if not task:
        return {"success": False, "error": "Task not found"}

    task.status = TaskStatus.REVIEW
    task.updatedAt = datetime.utcnow()
    return {"success": True, "data": task}


@router.patch("/{task_id}/status", response_model=dict[str, Any])
async def update_task_status(task_id: str, status: TaskStatus) -> dict[str, Any]:
    """Update task status."""
    task = _tasks_store.get(task_id)
    if not task:
        return {"success": False, "error": "Task not found"}

    task.status = status
    task.updatedAt = datetime.utcnow()
    return {"success": True, "data": task}


@router.post("/{task_id}/recover-stuck", response_model=dict[str, Any])
async def recover_stuck_task(task_id: str) -> dict[str, Any]:
    """Recover a stuck task."""
    task = _tasks_store.get(task_id)
    if not task:
        return {"success": False, "error": "Task not found"}

    task.status = TaskStatus.READY
    task.updatedAt = datetime.utcnow()
    return {"success": True, "data": task}


@router.post("/{task_id}/resume-paused", response_model=dict[str, Any])
async def resume_paused_task(task_id: str) -> dict[str, Any]:
    """Resume a paused task."""
    task = _tasks_store.get(task_id)
    if not task:
        return {"success": False, "error": "Task not found"}

    task.status = TaskStatus.IN_PROGRESS
    task.updatedAt = datetime.utcnow()
    return {"success": True, "data": task}


# ============================================
# Worktree Operations
# ============================================


@router.get("/{task_id}/worktree/status", response_model=dict[str, Any])
async def get_worktree_status(task_id: str) -> dict[str, Any]:
    """Get worktree status for a task."""
    task = _tasks_store.get(task_id)
    if not task:
        return {"success": False, "error": "Task not found"}

    # TODO: Implement actual worktree status check
    return {
        "success": True,
        "data": WorktreeStatus(exists=False, branch=None),
    }


@router.get("/{task_id}/worktree/diff", response_model=dict[str, Any])
async def get_worktree_diff(task_id: str) -> dict[str, Any]:
    """Get diff for worktree changes."""
    task = _tasks_store.get(task_id)
    if not task:
        return {"success": False, "error": "Task not found"}

    # TODO: Implement actual worktree diff
    return {"success": True, "data": ""}


@router.post("/{task_id}/worktree/merge", response_model=dict[str, Any])
async def merge_worktree(task_id: str) -> dict[str, Any]:
    """Merge worktree changes."""
    task = _tasks_store.get(task_id)
    if not task:
        return {"success": False, "error": "Task not found"}

    # TODO: Implement actual worktree merge
    return {"success": True}


@router.post("/{task_id}/worktree/discard", response_model=dict[str, Any])
async def discard_worktree(task_id: str) -> dict[str, Any]:
    """Discard worktree changes."""
    task = _tasks_store.get(task_id)
    if not task:
        return {"success": False, "error": "Task not found"}

    # TODO: Implement actual worktree discard
    return {"success": True}


@router.post("/{task_id}/worktree/create-pr", response_model=dict[str, Any])
async def create_pr_from_worktree(
    task_id: str,
    title: str | None = None,
    target_branch: str | None = None,
    draft: bool = False,
) -> dict[str, Any]:
    """Create PR from worktree."""
    task = _tasks_store.get(task_id)
    if not task:
        return {"success": False, "error": "Task not found"}

    # TODO: Implement actual PR creation
    return {"success": True, "data": {"url": "https://github.com/example/pr/1"}}


# ============================================
# Task Logs Operations
# ============================================


@router.get("/{task_id}/logs", response_model=dict[str, Any])
async def get_task_logs(task_id: str) -> dict[str, Any]:
    """Get logs for a task."""
    task = _tasks_store.get(task_id)
    if not task:
        return {"success": False, "error": "Task not found"}

    return {"success": True, "data": task.logs}


# ============================================
# Task Archive Operations
# ============================================


@router.post("/{task_id}/archive", response_model=dict[str, Any])
async def archive_task(task_id: str) -> dict[str, Any]:
    """Archive a task."""
    task = _tasks_store.get(task_id)
    if not task:
        return {"success": False, "error": "Task not found"}

    # TODO: Implement actual archiving
    return {"success": True}


@router.post("/{task_id}/unarchive", response_model=dict[str, Any])
async def unarchive_task(task_id: str) -> dict[str, Any]:
    """Unarchive a task."""
    task = _tasks_store.get(task_id)
    if not task:
        return {"success": False, "error": "Task not found"}

    # TODO: Implement actual unarchiving
    return {"success": True}
