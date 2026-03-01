#!/bin/bash
#
# Auto Claude Web - Build & Start Script
# =======================================
# Builds the frontend and starts the web server
#
# Usage:
#   ./start-web.sh              # Build and start on port 3000
#   ./start-web.sh --no-build   # Skip build, just start server
#   ./start-web.sh --port 8080  # Use custom port
#

set -e

# Default values
PORT=3000
SKIP_BUILD=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-build)
            SKIP_BUILD=true
            shift
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --no-build    Skip frontend build, just start server"
            echo "  --port PORT   Use custom port (default: 3000)"
            echo "  --help, -h    Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/apps/frontend"
BACKEND_DIR="$SCRIPT_DIR/apps/backend"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              Auto Claude Web - Starting...                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Build frontend
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${YELLOW}[1/2] Building frontend...${NC}"
    cd "$FRONTEND_DIR"

    if [ ! -d "node_modules" ]; then
        echo "  Installing dependencies..."
        npm install
    fi

    echo "  Building production bundle..."
    npm run build

    echo -e "${GREEN}  ✅ Frontend built successfully${NC}"
else
    echo -e "${YELLOW}[1/2] Skipping frontend build (--no-build)${NC}"
fi

# Start backend server
echo ""
echo -e "${YELLOW}[2/2] Starting web server...${NC}"
cd "$BACKEND_DIR"

# Check if static files exist
if [ ! -f "web/static/index.html" ]; then
    echo -e "${RED}  ⚠️  Warning: Frontend not built. Run without --no-build first.${NC}"
fi

echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  🚀 Auto Claude Web Server is running!                    ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo -e "║  ${NC}🌐  UI:      ${BLUE}http://127.0.0.1:$PORT${GREEN}                       ║"
echo -e "║  ${NC}🔌  API:     ${BLUE}http://127.0.0.1:$PORT/api${GREEN}                    ║"
echo -e "║  ${NC}❤️   Health:  ${BLUE}http://127.0.0.1:$PORT/api/health${GREEN}             ║"
echo "║                                                           ║"
echo "║  Press Ctrl+C to stop                                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Run the server
uvicorn web.app:create_app --factory --host 127.0.0.1 --port $PORT
