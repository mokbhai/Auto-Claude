"""
Projects API Router
===================

Handles project management operations.
Maps IPC channels: PROJECT_*, TAB_STATE_*, KANBAN_PREFS_*, GIT_*
"""

from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


# ============================================
# Data Models
# ============================================


class Project(BaseModel):
    """Project model."""

    id: str
    path: str
    name: str
    autoBuildPath: str | None = None
    settings: dict[str, Any] = {}


class ProjectSettings(BaseModel):
    """Project settings model."""

    defaultModel: str | None = None
    thinkingLevel: str | None = None
    isolatedMode: bool | None = None
    baseBranch: str | None = None


class TabState(BaseModel):
    """Tab state model."""

    openProjectIds: list[str]
    activeProjectId: str | None
    tabOrder: list[str]


class KanbanColumnPrefs(BaseModel):
    """Kanban column preferences."""

    width: int
    isCollapsed: bool
    isLocked: bool


class GitBranchDetail(BaseModel):
    """Git branch with type information."""

    name: str
    type: str  # 'local' or 'remote'
    displayName: str
    isCurrent: bool


class GitStatus(BaseModel):
    """Git repository status."""

    isRepo: bool
    hasCommits: bool
    currentBranch: str | None


class InitializationResult(BaseModel):
    """Result of project initialization."""

    success: bool
    error: str | None = None
    autoBuildPath: str | None = None


# ============================================
# In-Memory Store (will be replaced with proper persistence)
# ============================================

_projects_store: dict[str, Project] = {}
_tab_state: TabState = TabState(openProjectIds=[], activeProjectId=None, tabOrder=[])
_kanban_prefs: dict[str, dict[str, KanbanColumnPrefs]] = {}


# ============================================
# Project CRUD Operations
# ============================================


@router.get("", response_model=dict[str, Any])
async def list_projects() -> dict[str, Any]:
    """List all projects."""
    return {"success": True, "data": list(_projects_store.values())}


@router.post("", response_model=dict[str, Any])
async def add_project(project_path: str) -> dict[str, Any]:
    """Add a new project."""
    path = Path(project_path)
    if not path.exists():
        return {"success": False, "error": "Directory does not exist"}

    project_id = path.name  # Use directory name as ID for now
    project = Project(
        id=project_id,
        path=str(path),
        name=path.name,
    )
    _projects_store[project_id] = project
    return {"success": True, "data": project}


@router.delete("/{project_id}", response_model=dict[str, Any])
async def remove_project(project_id: str) -> dict[str, Any]:
    """Remove a project."""
    if project_id in _projects_store:
        del _projects_store[project_id]
        return {"success": True}
    return {"success": False, "error": "Project not found"}


@router.patch("/{project_id}/settings", response_model=dict[str, Any])
async def update_project_settings(
    project_id: str, settings: ProjectSettings
) -> dict[str, Any]:
    """Update project settings."""
    if project_id not in _projects_store:
        return {"success": False, "error": "Project not found"}

    project = _projects_store[project_id]
    project.settings.update(settings.model_dump(exclude_none=True))
    return {"success": True}


# ============================================
# Tab State Operations
# ============================================


@router.get("/tab-state", response_model=dict[str, Any])
async def get_tab_state() -> dict[str, Any]:
    """Get tab state for open projects."""
    return {"success": True, "data": _tab_state.model_dump()}


@router.post("/tab-state", response_model=dict[str, Any])
async def save_tab_state(state: TabState) -> dict[str, Any]:
    """Save tab state for open projects."""
    global _tab_state
    _tab_state = state
    return {"success": True}


# ============================================
# Kanban Preferences Operations
# ============================================


@router.get("/{project_id}/kanban-prefs", response_model=dict[str, Any])
async def get_kanban_prefs(project_id: str) -> dict[str, Any]:
    """Get Kanban preferences for a project."""
    prefs = _kanban_prefs.get(project_id)
    return {"success": True, "data": prefs}


@router.post("/{project_id}/kanban-prefs", response_model=dict[str, Any])
async def save_kanban_prefs(
    project_id: str, prefs: dict[str, KanbanColumnPrefs]
) -> dict[str, Any]:
    """Save Kanban preferences for a project."""
    _kanban_prefs[project_id] = prefs
    return {"success": True}


# ============================================
# Project Initialization Operations
# ============================================


@router.post("/{project_id}/initialize", response_model=dict[str, Any])
async def initialize_project(project_id: str) -> dict[str, Any]:
    """Initialize a project for Auto Claude."""
    if project_id not in _projects_store:
        return {"success": False, "error": "Project not found"}

    project = _projects_store[project_id]
    path = Path(project.path)

    # Create .auto-claude directory
    auto_claude_dir = path / ".auto-claude"
    try:
        auto_claude_dir.mkdir(exist_ok=True)
        (auto_claude_dir / "specs").mkdir(exist_ok=True)
        project.autoBuildPath = ".auto-claude"
        return {
            "success": True,
            "data": InitializationResult(
                success=True, autoBuildPath=".auto-claude"
            ),
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": InitializationResult(success=False, error=str(e)),
        }


@router.get("/{project_id}/check-version", response_model=dict[str, Any])
async def check_project_version(project_id: str) -> dict[str, Any]:
    """Check if project is initialized."""
    if project_id not in _projects_store:
        return {"success": False, "error": "Project not found"}

    project = _projects_store[project_id]
    is_initialized = project.autoBuildPath is not None

    return {
        "success": True,
        "data": {"isInitialized": is_initialized, "updateAvailable": False},
    }


# ============================================
# Git Operations
# ============================================


@router.get("/{project_id}/git/branches", response_model=dict[str, Any])
async def get_git_branches(project_id: str) -> dict[str, Any]:
    """Get git branches for a project."""
    if project_id not in _projects_store:
        return {"success": False, "error": "Project not found"}

    # TODO: Implement actual git branch fetching
    return {"success": True, "data": []}


@router.get("/{project_id}/git/branches-with-info", response_model=dict[str, Any])
async def get_git_branches_with_info(project_id: str) -> dict[str, Any]:
    """Get git branches with type information."""
    if project_id not in _projects_store:
        return {"success": False, "error": "Project not found"}

    # TODO: Implement actual git branch fetching
    return {"success": True, "data": []}


@router.get("/{project_id}/git/current-branch", response_model=dict[str, Any])
async def get_current_branch(project_id: str) -> dict[str, Any]:
    """Get the current git branch."""
    if project_id not in _projects_store:
        return {"success": False, "error": "Project not found"}

    # TODO: Implement actual git branch detection
    return {"success": True, "data": None}


@router.get("/{project_id}/git/detect-main-branch", response_model=dict[str, Any])
async def detect_main_branch(project_id: str) -> dict[str, Any]:
    """Detect the main branch for a repository."""
    if project_id not in _projects_store:
        return {"success": False, "error": "Project not found"}

    # TODO: Implement actual main branch detection
    return {"success": True, "data": None}


@router.get("/{project_id}/git/status", response_model=dict[str, Any])
async def check_git_status(project_id: str) -> dict[str, Any]:
    """Check git status for a project."""
    if project_id not in _projects_store:
        return {"success": False, "error": "Project not found"}

    # TODO: Implement actual git status check
    return {
        "success": True,
        "data": GitStatus(isRepo=False, hasCommits=False, currentBranch=None),
    }


@router.post("/{project_id}/git/initialize", response_model=dict[str, Any])
async def initialize_git(project_id: str) -> dict[str, Any]:
    """Initialize git in a project."""
    if project_id not in _projects_store:
        return {"success": False, "error": "Project not found"}

    # TODO: Implement actual git initialization
    return {
        "success": True,
        "data": InitializationResult(success=True),
    }
