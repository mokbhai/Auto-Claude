"""
Profiles API Router
===================

Handles Claude API profiles (OAuth and custom endpoints).
Maps IPC channels: CLAUDE_PROFILE_*, PROFILES_*, ACCOUNT_*, USAGE_*, QUEUE_*
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


class ProfileType(str, Enum):
    """Profile type enum."""

    OAUTH = "oauth"
    API_KEY = "api_key"


class ClaudeProfile(BaseModel):
    """Claude OAuth profile model."""

    id: str
    name: str
    email: str | None = None
    isActive: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    lastUsed: datetime | None = None
    tokenExpiry: datetime | None = None


class APIProfile(BaseModel):
    """Custom API profile model."""

    id: str
    name: str
    baseUrl: str
    apiKey: str | None = None  # Encrypted
    isActive: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
    defaultModel: str | None = None
    models: list[str] = []


class ProfileUsage(BaseModel):
    """Profile usage data."""

    profileId: str
    usedTokens: int = 0
    limitTokens: int | None = None
    resetDate: datetime | None = None
    percentage: float = 0.0


class AutoSwitchSettings(BaseModel):
    """Auto-switch settings."""

    enabled: bool = True
    thresholdPercent: int = 80
    switchOnRateLimit: bool = True


# ============================================
# In-Memory Stores
# ============================================

_claude_profiles: dict[str, ClaudeProfile] = {}
_api_profiles: dict[str, APIProfile] = {}
_account_priority: list[str] = []
_auto_switch_settings = AutoSwitchSettings()
_usage_data: dict[str, ProfileUsage] = {}


# ============================================
# Claude OAuth Profile Operations
# ============================================


@router.get("/claude", response_model=dict[str, Any])
async def get_claude_profiles() -> dict[str, Any]:
    """Get all Claude OAuth profiles."""
    return {"success": True, "data": list(_claude_profiles.values())}


@router.post("/claude", response_model=dict[str, Any])
async def save_claude_profile(profile: ClaudeProfile) -> dict[str, Any]:
    """Save a Claude OAuth profile."""
    _claude_profiles[profile.id] = profile
    return {"success": True, "data": profile}


@router.delete("/claude/{profile_id}", response_model=dict[str, Any])
async def delete_claude_profile(profile_id: str) -> dict[str, Any]:
    """Delete a Claude OAuth profile."""
    if profile_id in _claude_profiles:
        del _claude_profiles[profile_id]
        return {"success": True}
    return {"success": False, "error": "Profile not found"}


@router.post("/claude/{profile_id}/rename", response_model=dict[str, Any])
async def rename_claude_profile(profile_id: str, name: str) -> dict[str, Any]:
    """Rename a Claude OAuth profile."""
    if profile_id in _claude_profiles:
        _claude_profiles[profile_id].name = name
        return {"success": True}
    return {"success": False, "error": "Profile not found"}


@router.post("/claude/{profile_id}/set-active", response_model=dict[str, Any])
async def set_active_claude_profile(profile_id: str) -> dict[str, Any]:
    """Set active Claude OAuth profile."""
    for profile in _claude_profiles.values():
        profile.isActive = profile.id == profile_id
    return {"success": True}


@router.post("/claude/{profile_id}/switch", response_model=dict[str, Any])
async def switch_claude_profile(profile_id: str) -> dict[str, Any]:
    """Switch to a Claude OAuth profile."""
    if profile_id not in _claude_profiles:
        return {"success": False, "error": "Profile not found"}

    for profile in _claude_profiles.values():
        profile.isActive = profile.id == profile_id

    return {"success": True, "data": _claude_profiles[profile_id]}


@router.post("/claude/{profile_id}/set-token", response_model=dict[str, Any])
async def set_claude_profile_token(profile_id: str, token: str) -> dict[str, Any]:
    """Set OAuth token for a profile."""
    # TODO: Implement secure token storage
    return {"success": True}


@router.post("/claude/{profile_id}/authenticate", response_model=dict[str, Any])
async def authenticate_claude_profile(profile_id: str) -> dict[str, Any]:
    """Start OAuth authentication for a profile."""
    # TODO: Implement OAuth flow
    return {"success": True, "data": {"status": "started"}}


@router.get("/claude/{profile_id}/verify-auth", response_model=dict[str, Any])
async def verify_claude_profile_auth(profile_id: str) -> dict[str, Any]:
    """Verify if profile is authenticated."""
    # TODO: Implement auth verification
    return {"success": True, "data": {"authenticated": False}}


# ============================================
# API Profile Operations (Custom Endpoints)
# ============================================


@router.get("/api", response_model=dict[str, Any])
async def get_api_profiles() -> dict[str, Any]:
    """Get all custom API profiles."""
    return {
        "success": True,
        "data": {
            "profiles": list(_api_profiles.values()),
            "activeProfileId": next(
                (p.id for p in _api_profiles.values() if p.isActive), None
            ),
            "version": 1,
        },
    }


@router.post("/api", response_model=dict[str, Any])
async def save_api_profile(profile: APIProfile) -> dict[str, Any]:
    """Save a custom API profile."""
    _api_profiles[profile.id] = profile
    return {"success": True, "data": profile}


@router.patch("/api/{profile_id}", response_model=dict[str, Any])
async def update_api_profile(profile_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    """Update a custom API profile."""
    if profile_id not in _api_profiles:
        return {"success": False, "error": "Profile not found"}

    profile = _api_profiles[profile_id]
    for key, value in updates.items():
        if hasattr(profile, key):
            setattr(profile, key, value)
    profile.updatedAt = datetime.utcnow()

    return {"success": True, "data": profile}


@router.delete("/api/{profile_id}", response_model=dict[str, Any])
async def delete_api_profile(profile_id: str) -> dict[str, Any]:
    """Delete a custom API profile."""
    if profile_id in _api_profiles:
        del _api_profiles[profile_id]
        return {"success": True}
    return {"success": False, "error": "Profile not found"}


@router.post("/api/{profile_id}/set-active", response_model=dict[str, Any])
async def set_active_api_profile(profile_id: str | None) -> dict[str, Any]:
    """Set active custom API profile."""
    for profile in _api_profiles.values():
        profile.isActive = profile.id == profile_id
    return {"success": True}


@router.post("/api/test-connection", response_model=dict[str, Any])
async def test_api_connection(
    base_url: str, api_key: str | None = None
) -> dict[str, Any]:
    """Test connection to a custom API endpoint."""
    # TODO: Implement actual connection test
    return {"success": True, "data": {"success": True, "message": "Connection OK"}}


@router.post("/api/discover-models", response_model=dict[str, Any])
async def discover_api_models(
    base_url: str, api_key: str | None = None
) -> dict[str, Any]:
    """Discover available models from a custom API endpoint."""
    # TODO: Implement actual model discovery
    return {"success": True, "data": {"models": []}}


# ============================================
# Account Priority Operations
# ============================================


@router.get("/priority", response_model=dict[str, Any])
async def get_account_priority() -> dict[str, Any]:
    """Get account priority order."""
    return {"success": True, "data": _account_priority}


@router.post("/priority", response_model=dict[str, Any])
async def set_account_priority(priority: list[str]) -> dict[str, Any]:
    """Set account priority order."""
    global _account_priority
    _account_priority = priority
    return {"success": True}


# ============================================
# Auto-Switch Settings
# ============================================


@router.get("/auto-switch", response_model=dict[str, Any])
async def get_auto_switch_settings() -> dict[str, Any]:
    """Get auto-switch settings."""
    return {"success": True, "data": _auto_switch_settings.model_dump()}


@router.post("/auto-switch", response_model=dict[str, Any])
async def update_auto_switch_settings(settings: AutoSwitchSettings) -> dict[str, Any]:
    """Update auto-switch settings."""
    global _auto_switch_settings
    _auto_switch_settings = settings
    return {"success": True}


# ============================================
# Usage Monitoring
# ============================================


@router.get("/usage", response_model=dict[str, Any])
async def get_usage() -> dict[str, Any]:
    """Get current profile usage."""
    return {"success": True, "data": _usage_data}


@router.get("/usage/all", response_model=dict[str, Any])
async def get_all_profiles_usage() -> dict[str, Any]:
    """Get usage for all profiles."""
    return {"success": True, "data": _usage_data}


@router.get("/best", response_model=dict[str, Any])
async def get_best_profile() -> dict[str, Any]:
    """Get the best available profile."""
    # TODO: Implement profile scoring
    return {"success": True, "data": None}


# ============================================
# Queue Routing Operations
# ============================================


@router.get("/queue/running-by-profile", response_model=dict[str, Any])
async def get_running_tasks_by_profile() -> dict[str, Any]:
    """Get running tasks grouped by profile."""
    return {"success": True, "data": {"byProfile": {}, "totalRunning": 0}}


@router.get("/queue/best-for-task/{task_id}", response_model=dict[str, Any])
async def get_best_profile_for_task(task_id: str) -> dict[str, Any]:
    """Get best profile for a specific task."""
    # TODO: Implement task-based profile selection
    return {"success": True, "data": None}


@router.get("/queue/best-unified", response_model=dict[str, Any])
async def get_best_unified_account() -> dict[str, Any]:
    """Get best unified account (OAuth or API)."""
    # TODO: Implement unified account selection
    return {"success": True, "data": None}


@router.post("/queue/assign/{task_id}", response_model=dict[str, Any])
async def assign_profile_to_task(task_id: str, profile_id: str) -> dict[str, Any]:
    """Assign a profile to a task."""
    return {"success": True}


@router.post("/queue/session/{task_id}", response_model=dict[str, Any])
async def update_task_session(task_id: str, session_id: str) -> dict[str, Any]:
    """Update session for a task."""
    return {"success": True}


@router.get("/queue/session/{task_id}", response_model=dict[str, Any])
async def get_task_session(task_id: str) -> dict[str, Any]:
    """Get session for a task."""
    return {"success": True, "data": None}
