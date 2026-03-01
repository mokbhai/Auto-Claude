"""
FastAPI Application Factory
===========================

Creates and configures the FastAPI web application for Auto Claude.
Serves the React frontend and provides REST/WebSocket APIs.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .services.event_bus import EventBus
from .services.pty_manager import PTYManager


# Global service instances
_pty_manager: PTYManager | None = None
_event_bus: EventBus | None = None


def get_pty_manager() -> PTYManager:
    """Get the global PTY manager instance."""
    global _pty_manager
    if _pty_manager is None:
        raise RuntimeError("PTY manager not initialized. Call create_app first.")
    return _pty_manager


def get_event_bus() -> EventBus:
    """Get the global event bus instance."""
    global _event_bus
    if _event_bus is None:
        raise RuntimeError("Event bus not initialized. Call create_app first.")
    return _event_bus


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager for startup and shutdown."""
    global _pty_manager, _event_bus

    # Startup
    _event_bus = EventBus()
    _pty_manager = PTYManager(event_bus=_event_bus)

    yield

    # Shutdown
    if _pty_manager:
        await _pty_manager.shutdown()


def create_app(
    static_dir: Path | None = None,
    cors_origins: list[str] | None = None,
) -> FastAPI:
    """
    Create and configure the FastAPI application.

    Args:
        static_dir: Directory containing built frontend assets.
                    Defaults to apps/backend/web/static/
        cors_origins: Allowed CORS origins. Defaults to ["*"] for development.

    Returns:
        Configured FastAPI application instance.
    """
    app = FastAPI(
        title="Auto Claude",
        description="Autonomous multi-agent coding framework",
        version="1.0.0",
        lifespan=lifespan,
    )

    # Configure CORS
    origins = cors_origins or ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Import and include routers
    from .routers import (
        context,
        github,
        gitlab,
        insights,
        profiles,
        projects,
        roadmap,
        settings,
        tasks,
        terminals,
    )

    app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
    app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
    app.include_router(terminals.router, prefix="/api/terminals", tags=["terminals"])
    app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
    app.include_router(profiles.router, prefix="/api/profiles", tags=["profiles"])
    app.include_router(context.router, prefix="/api/context", tags=["context"])
    app.include_router(roadmap.router, prefix="/api/roadmap", tags=["roadmap"])
    app.include_router(insights.router, prefix="/api/insights", tags=["insights"])
    app.include_router(github.router, prefix="/api/github", tags=["github"])
    app.include_router(gitlab.router, prefix="/api/gitlab", tags=["gitlab"])

    # Health check endpoint
    @app.get("/api/health")
    async def health_check() -> dict:
        """Health check endpoint for load balancers and monitoring."""
        return {"status": "ok", "service": "auto-claude"}

    # Serve static frontend files
    if static_dir is None:
        static_dir = Path(__file__).parent / "static"

    if static_dir.exists() and (static_dir / "index.html").exists():
        # Serve index.html for SPA routing
        from fastapi.responses import FileResponse

        @app.get("/", response_class=FileResponse)
        async def serve_index():
            return static_dir / "index.html"

        # Mount static assets if assets directory exists
        assets_dir = static_dir / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

        # Catch-all route for SPA
        @app.get("/{path:path}", response_class=FileResponse)
        async def serve_spa(path: str):
            """Serve index.html for client-side routing."""
            # Check if requesting a specific file
            file_path = static_dir / path
            if file_path.exists() and file_path.is_file():
                return file_path
            # Otherwise serve index.html for SPA routing
            return static_dir / "index.html"
    else:
        # API-only mode (no frontend built yet)
        @app.get("/")
        async def api_only_mode():
            """API-only mode - frontend not built."""
            return {
                "message": "Auto Claude API",
                "status": "api-only",
                "hint": "Build the frontend with: cd apps/frontend && npm run build:web"
            }

    return app


def run_server(
    host: str = "127.0.0.1",
    port: int = 3000,
    static_dir: Path | None = None,
    reload: bool = False,
) -> None:
    """
    Run the FastAPI development server.

    Args:
        host: Host to bind to.
        port: Port to listen on.
        static_dir: Directory containing built frontend assets.
        reload: Enable auto-reload for development.
    """
    import uvicorn

    app = create_app(static_dir=static_dir)

    uvicorn.run(
        "web.app:create_app",
        host=host,
        port=port,
        reload=reload,
        factory=True,
    )
