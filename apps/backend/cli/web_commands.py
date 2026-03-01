"""
Web Server CLI Commands
=======================

Handles the --web CLI command to start the FastAPI web server.
"""

import argparse
import webbrowser
from pathlib import Path


def add_web_arguments(parser: argparse.ArgumentParser) -> None:
    """Add web server arguments to the argument parser."""
    parser.add_argument(
        "--web",
        action="store_true",
        help="Start the web interface server",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=3000,
        help="Port for the web server (default: 3000)",
    )
    parser.add_argument(
        "--host",
        type=str,
        default="127.0.0.1",
        help="Host for the web server (default: 127.0.0.1)",
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Don't open browser automatically",
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload for development",
    )


def handle_web_command(args: argparse.Namespace) -> None:
    """Handle the --web command to start the web server."""
    import sys

    # Add parent directory to path for imports
    backend_dir = Path(__file__).parent.parent
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    from web.app import run_server

    # Determine static files directory
    # In development, frontend builds to web/static/
    # In production (PyPI package), static files are bundled
    static_dir = backend_dir / "web" / "static"

    if not static_dir.exists():
        print(f"Warning: Static files directory not found at {static_dir}")
        print("Build the frontend first with: cd apps/frontend && npm run build")
        print("\nStarting server without frontend (API-only mode)...")

    print(f"\nStarting Auto Claude Web Server...")
    print(f"  Host: {args.host}")
    print(f"  Port: {args.port}")
    print(f"  Static: {static_dir if static_dir.exists() else 'Not found'}")
    print(f"\n  API: http://{args.host}:{args.port}/api")
    print(f"  Health: http://{args.host}:{args.port}/api/health")

    if static_dir.exists():
        print(f"  UI: http://{args.host}:{args.port}")

    print("\nPress Ctrl+C to stop the server.\n")

    # Open browser unless --no-browser was specified
    if not args.no_browser and static_dir.exists():
        url = f"http://{args.host}:{args.port}"
        webbrowser.open(url)

    # Run the server
    run_server(
        host=args.host,
        port=args.port,
        static_dir=static_dir,
        reload=args.reload,
    )
