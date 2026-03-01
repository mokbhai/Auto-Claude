"""
Auto Claude Web Interface
=========================

FastAPI-based web server that serves the frontend and provides REST/WebSocket APIs.
This replaces the Electron main process for a pure web interface.
"""

from .app import create_app, run_server

__all__ = ["create_app", "run_server"]
