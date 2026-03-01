"""
Event Bus for WebSocket Broadcasting
====================================

Provides a centralized event bus for broadcasting events to connected WebSocket clients.
Replaces Electron's IPC event system for real-time updates.
"""

import asyncio
import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

from fastapi import WebSocket


class EventType(str, Enum):
    """Event types matching IPC channels."""

    # Task events
    TASK_PROGRESS = "task:progress"
    TASK_ERROR = "task:error"
    TASK_LOG = "task:log"
    TASK_STATUS_CHANGE = "task:statusChange"
    TASK_EXECUTION_PROGRESS = "task:executionProgress"
    TASK_LOGS_CHANGED = "task:logsChanged"
    TASK_LOGS_STREAM = "task:logsStream"
    TASK_MERGE_PROGRESS = "task:mergeProgress"

    # Terminal events
    TERMINAL_OUTPUT = "terminal:output"
    TERMINAL_EXIT = "terminal:exit"
    TERMINAL_TITLE_CHANGE = "terminal:titleChange"
    TERMINAL_WORKTREE_CONFIG_CHANGE = "terminal:worktreeConfigChange"
    TERMINAL_CLAUDE_SESSION = "terminal:claudeSession"
    TERMINAL_PENDING_RESUME = "terminal:pendingResume"
    TERMINAL_RATE_LIMIT = "terminal:rateLimit"
    TERMINAL_OAUTH_TOKEN = "terminal:oauthToken"
    TERMINAL_AUTH_CREATED = "terminal:authCreated"
    TERMINAL_OAUTH_CODE_NEEDED = "terminal:oauthCodeNeeded"
    TERMINAL_CLAUDE_BUSY = "terminal:claudeBusy"
    TERMINAL_CLAUDE_EXIT = "terminal:claudeExit"
    TERMINAL_ONBOARDING_COMPLETE = "terminal:onboardingComplete"
    TERMINAL_PROFILE_CHANGED = "terminal:profileChanged"

    # Roadmap events
    ROADMAP_PROGRESS = "roadmap:progress"
    ROADMAP_COMPLETE = "roadmap:complete"
    ROADMAP_ERROR = "roadmap:error"
    ROADMAP_STOPPED = "roadmap:stopped"

    # Ideation events
    IDEATION_PROGRESS = "ideation:progress"
    IDEATION_LOG = "ideation:log"
    IDEATION_COMPLETE = "ideation:complete"
    IDEATION_ERROR = "ideation:error"
    IDEATION_STOPPED = "ideation:stopped"
    IDEATION_TYPE_COMPLETE = "ideation:typeComplete"
    IDEATION_TYPE_FAILED = "ideation:typeFailed"

    # GitHub events
    GITHUB_AUTH_DEVICE_CODE = "github:authDeviceCode"
    GITHUB_AUTH_CHANGED = "github:authChanged"
    GITHUB_INVESTIGATION_PROGRESS = "github:investigationProgress"
    GITHUB_INVESTIGATION_COMPLETE = "github:investigationComplete"
    GITHUB_INVESTIGATION_ERROR = "github:investigationError"
    GITHUB_PR_REVIEW_PROGRESS = "github:pr:reviewProgress"
    GITHUB_PR_REVIEW_COMPLETE = "github:pr:reviewComplete"
    GITHUB_PR_REVIEW_ERROR = "github:pr:reviewError"
    GITHUB_PR_REVIEW_STATE_CHANGE = "github:pr:reviewStateChange"
    GITHUB_PR_LOGS_UPDATED = "github:pr:logsUpdated"
    GITHUB_PR_STATUS_UPDATE = "github:pr:statusUpdate"

    # GitLab events (similar to GitHub)
    GITLAB_INVESTIGATION_PROGRESS = "gitlab:investigationProgress"
    GITLAB_INVESTIGATION_COMPLETE = "gitlab:investigationComplete"
    GITLAB_INVESTIGATION_ERROR = "gitlab:investigationError"
    GITLAB_MR_REVIEW_PROGRESS = "gitlab:mr:reviewProgress"
    GITLAB_MR_REVIEW_COMPLETE = "gitlab:mr:reviewComplete"
    GITLAB_MR_REVIEW_ERROR = "gitlab:mr:reviewError"

    # Insights events
    INSIGHTS_STREAM_CHUNK = "insights:streamChunk"
    INSIGHTS_STATUS = "insights:status"
    INSIGHTS_ERROR = "insights:error"
    INSIGHTS_SESSION_UPDATED = "insights:sessionUpdated"

    # Changelog events
    CHANGELOG_GENERATION_PROGRESS = "changelog:generationProgress"
    CHANGELOG_GENERATION_COMPLETE = "changelog:generationComplete"
    CHANGELOG_GENERATION_ERROR = "changelog:generationError"

    # Usage events
    USAGE_UPDATED = "claude:usageUpdated"
    ALL_PROFILES_USAGE_UPDATED = "claude:allProfilesUsageUpdated"
    PROACTIVE_SWAP_NOTIFICATION = "claude:proactiveSwapNotification"

    # Queue events
    QUEUE_PROFILE_SWAPPED = "queue:profileSwapped"
    QUEUE_SESSION_CAPTURED = "queue:sessionCaptured"
    QUEUE_BLOCKED_NO_PROFILES = "queue:blockedNoProfiles"


@dataclass
class Event:
    """Represents an event to be broadcast."""

    event_type: EventType | str
    data: Any
    project_id: str | None = None
    task_id: str | None = None
    terminal_id: str | None = None


@dataclass
class Subscription:
    """Represents a WebSocket subscription."""

    websocket: WebSocket
    event_types: set[str] = field(default_factory=set)
    project_id: str | None = None


class EventBus:
    """
    Centralized event bus for WebSocket broadcasting.

    Manages WebSocket connections and broadcasts events to appropriate subscribers.
    """

    def __init__(self) -> None:
        self._subscriptions: list[Subscription] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        """Accept a new WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self._subscriptions.append(Subscription(websocket=websocket))

    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection."""
        async with self._lock:
            self._subscriptions = [
                sub for sub in self._subscriptions if sub.websocket != websocket
            ]

    async def subscribe(
        self,
        websocket: WebSocket,
        event_types: list[str] | None = None,
        project_id: str | None = None,
    ) -> None:
        """Update subscription preferences for a WebSocket."""
        async with self._lock:
            for sub in self._subscriptions:
                if sub.websocket == websocket:
                    if event_types:
                        sub.event_types.update(event_types)
                    if project_id:
                        sub.project_id = project_id
                    break

    async def broadcast(self, event: Event) -> None:
        """Broadcast an event to all relevant subscribers."""
        message = {
            "type": event.event_type if isinstance(event.event_type, str) else event.event_type.value,
            "data": event.data,
        }

        if event.project_id:
            message["projectId"] = event.project_id
        if event.task_id:
            message["taskId"] = event.task_id
        if event.terminal_id:
            message["terminalId"] = event.terminal_id

        async with self._lock:
            disconnected = []
            for sub in self._subscriptions:
                try:
                    # Check if this subscription should receive this event
                    if self._should_receive(sub, event):
                        await sub.websocket.send_json(message)
                except Exception:
                    disconnected.append(sub)

            # Clean up disconnected WebSockets
            for sub in disconnected:
                self._subscriptions.remove(sub)

    def _should_receive(self, sub: Subscription, event: Event) -> bool:
        """Check if a subscription should receive an event."""
        # If no specific event types subscribed, receive all
        if not sub.event_types:
            return True

        event_type_str = event.event_type if isinstance(event.event_type, str) else event.event_type.value

        # Check event type match
        if event_type_str not in sub.event_types:
            return False

        # Check project ID match if specified
        if sub.project_id and event.project_id and sub.project_id != event.project_id:
            return False

        return True

    async def emit(self, event_type: EventType | str, data: Any, **kwargs) -> None:
        """Convenience method to emit an event."""
        event = Event(event_type=event_type, data=data, **kwargs)
        await self.broadcast(event)
