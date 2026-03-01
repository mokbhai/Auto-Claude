"""
Settings API Router
===================

Handles application settings.
Maps IPC channels: SETTINGS_*
"""

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


# ============================================
# Data Models
# ============================================


class AppSettings(BaseModel):
    """Application settings model."""

    # Theme settings
    theme: str = "default"
    colorMode: str = "dark"

    # Editor settings
    fontSize: int = 14
    fontFamily: str = "monospace"
    tabSize: int = 2

    # Terminal settings
    terminalFontSize: int = 14
    terminalFontFamily: str = "monospace"
    terminalCursorStyle: str = "block"
    terminalCursorBlink: bool = True

    # Task settings
    defaultModel: str | None = None
    thinkingLevel: str = "medium"
    autoCommit: bool = False
    isolatedMode: bool = True

    # Notifications
    enableNotifications: bool = True
    notifyOnTaskComplete: bool = True
    notifyOnTaskError: bool = True

    # Advanced settings
    maxParallelAgents: int = 4
    enableMemorySystem: bool = False
    enableSentry: bool = True

    # Language
    language: str = "en"


class CliToolsInfo(BaseModel):
    """CLI tools information."""

    claudeCode: dict[str, Any] = {}
    git: dict[str, Any] = {}
    gh: dict[str, Any] = {}
    glab: dict[str, Any] = {}


# ============================================
# In-Memory Store
# ============================================

_current_settings = AppSettings()


# ============================================
# Settings Operations
# ============================================


@router.get("", response_model=dict[str, Any])
async def get_settings() -> dict[str, Any]:
    """Get current application settings."""
    return {"success": True, "data": _current_settings.model_dump()}


@router.post("", response_model=dict[str, Any])
async def save_settings(settings: AppSettings) -> dict[str, Any]:
    """Save application settings."""
    global _current_settings
    _current_settings = settings
    return {"success": True}


@router.patch("", response_model=dict[str, Any])
async def update_settings(settings: dict[str, Any]) -> dict[str, Any]:
    """Update specific settings."""
    global _current_settings
    for key, value in settings.items():
        if hasattr(_current_settings, key):
            setattr(_current_settings, key, value)
    return {"success": True, "data": _current_settings.model_dump()}


@router.get("/cli-tools-info", response_model=dict[str, Any])
async def get_cli_tools_info() -> dict[str, Any]:
    """Get information about installed CLI tools."""
    # TODO: Implement actual CLI tool detection
    return {
        "success": True,
        "data": CliToolsInfo().model_dump(),
    }


@router.get("/claude-code/onboarding-status", response_model=dict[str, Any])
async def get_claude_code_onboarding_status() -> dict[str, Any]:
    """Get Claude Code onboarding status."""
    # TODO: Implement actual onboarding status check
    return {
        "success": True,
        "data": {"hasCompletedOnboarding": False},
    }
