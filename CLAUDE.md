# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

Auto Claude is an autonomous multi-agent coding framework that plans, builds, and validates software for you. It's a monorepo with a Python backend (CLI + agent logic + FastAPI web server) and a React/TypeScript frontend (web UI).

## Product Overview

Auto Claude is a web application (+ CLI) where users describe a goal and AI agents autonomously handle planning, implementation, and QA validation. By default, work happens in isolated git worktrees so the main branch stays safe, but direct mode is available for faster iteration.

**Core workflow:** User creates a task → Spec creation pipeline assesses complexity and writes a specification → Planner agent breaks it into subtasks → Coder agent implements (can spawn parallel subagents) → QA reviewer validates → QA fixer resolves issues → User reviews and merges.

**Main features:**

- **Autonomous Tasks** — Multi-agent pipeline (planner, coder, QA) that builds features end-to-end
- **Kanban Board** — Visual task management from planning through completion
- **Agent Terminals** — Up to 12 parallel AI-powered terminals with task context injection
- **Insights** — AI chat interface for exploring and understanding your codebase
- **Roadmap** — AI-assisted feature planning with strategic roadmap generation
- **Ideation** — Discover improvements, performance issues, and security vulnerabilities
- **GitHub/GitLab Integration** — Import issues, AI-powered investigation, PR/MR review and creation
- **Changelog** — Generate release notes from completed tasks
- **Memory System** — Graphiti-based knowledge graph retains insights across sessions
- **Optional Isolated Workspaces** — Git worktree isolation (default) keeps main branch safe; direct mode available for faster iteration; AI-powered semantic merge
- **Flexible Authentication** — Use a Claude Code subscription (OAuth) or API profiles with any Anthropic-compatible endpoint (e.g., Anthropic API, z.ai for GLM models)
- **Multi-Account Swapping** — Register multiple Claude accounts; when one hits a rate limit, Auto Claude automatically switches to an available account
- **Web Interface** — Browser-based UI accessible from any platform
- **REST API** — Full REST/WebSocket API for programmatic access

## Critical Rules

**Claude Agent SDK only** — All AI interactions use `claude-agent-sdk` because it handles security hooks, tool permissions, and MCP server integration. Use `create_client()` from `core.client`, not `anthropic.Anthropic()` directly.

**i18n required** — All frontend user-facing text uses `react-i18next` translation keys. Hardcoded strings in JSX/TSX break localization for non-English users. Add keys to both `en/*.json` and `fr/*.json`.

**Platform abstraction** — Use the platform modules in `apps/backend/core/platform/` instead of `process.platform` directly. CI tests all three platforms, and raw platform checks cause failures.

**No time estimates** — Provide priority-based ordering instead of duration predictions.

**PR target** — Always target the `develop` branch for PRs, not `main`. Main is reserved for releases.

## Work Approach: Orchestrator-First

You are an orchestrator. Your primary role is to understand what needs to be done, break it into workstreams, and delegate execution to agent teams. This keeps your context window focused on coordination and decision-making rather than filling up with implementation details.

<orchestrator_pattern>
When given a task, follow this pattern:

1. **Investigate first** — Read the actual code before forming any hypothesis. Use targeted searches (Glob, Grep, Read) for simple lookups. For broader exploration, spawn an Explore agent.

2. **Plan the approach** — Identify what needs to change, which files are involved, and whether work can be parallelized. For multi-step tasks, create a task list to track workstreams.

3. **Delegate execution** — Spawn agent teams to do the implementation work. Each agent gets a clear, self-contained assignment with all the context it needs: relevant file paths, the specific change to make, and acceptance criteria. Run independent workstreams in parallel.

4. **Verify and integrate** — Review agent outputs, run tests, and ensure changes work together. Fix integration issues or spawn follow-up agents as needed.
</orchestrator_pattern>

**When to delegate vs. do directly:**
- Delegate: multi-file changes, research across the codebase, independent parallel workstreams, tasks that would consume significant context
- Do directly: single-file edits, simple bug fixes, quick lookups, tasks where you already have the context

**Giving agents good assignments** — Each agent works with a fresh context. Include: the specific goal, relevant file paths, code patterns to follow, and what "done" looks like. Agents perform better with explicit, complete instructions than with vague references to "the current task."

**Minimal changes only** — Prefer the simplest approach (e.g., prompt-only changes, single guard clause) before suggesting multi-component solutions. If the user asks for X, implement X — don't bundle additional fixes they didn't request.

**Default to action** — When the user's intent implies making changes, implement them rather than only suggesting. If something is unclear, read the relevant code to fill in the gaps rather than asking. Only ask when genuine ambiguity remains about what the user wants.

## Context Management

Your context window will be automatically compacted as it approaches its limit, allowing you to continue working indefinitely. Do not stop tasks early due to context concerns — instead, persist progress and keep going.

**For long-running tasks:** Use git commits, task lists, and structured notes to track state. When context compacts, review git log and any progress files to re-orient. Focus on incremental progress — complete one component before moving to the next, and commit working states along the way.

**Parallel tool calls** — When reading multiple files, running independent searches, or executing unrelated commands, make all calls in parallel rather than sequentially. This significantly speeds up investigation and implementation.

## Known Gotchas

**Web backend static files** — The frontend must be built before starting the web server in production mode. The build outputs to `apps/backend/web/static/`. Run `npm run build` in `apps/frontend` first.

**WebSocket connections** — Terminal I/O uses WebSocket connections. Ensure the backend WebSocket endpoint is accessible and CORS is properly configured for your deployment.

### Resetting PR Review State

To fully clear all PR review data so reviews run fresh, delete/reset these three things in `.auto-claude/github/`:

1. `rm .auto-claude/github/pr/logs_*.json` — review log files
2. `rm .auto-claude/github/pr/review_*.json` — review result files
3. Reset `pr/index.json` to `{"reviews": [], "last_updated": null}`
4. Reset `bot_detection_state.json` to `{"reviewed_commits": {}}` — this is the gatekeeper; without clearing it, the bot detector skips already-seen commits

## Project Structure

```
autonomous-coding/
├── apps/
│   ├── backend/                 # Python backend/CLI — ALL agent logic
│   │   ├── core/                # client.py, auth.py, worktree.py, platform/
│   │   ├── security/            # Command allowlisting, validators, hooks
│   │   ├── agents/              # planner, coder, session management
│   │   ├── qa/                  # reviewer, fixer, loop, criteria
│   │   ├── spec/                # Spec creation pipeline
│   │   ├── cli/                 # CLI commands (spec, build, workspace, QA, web)
│   │   ├── web/                 # FastAPI web server & REST API
│   │   │   ├── app.py           # Application factory
│   │   │   ├── routers/         # API endpoints (tasks, terminals, github, etc.)
│   │   │   ├── services/        # Event bus, PTY manager
│   │   │   └── static/          # Built frontend assets
│   │   ├── context/             # Task context building, semantic search
│   │   ├── runners/             # Standalone runners (spec, roadmap, insights, github)
│   │   ├── services/            # Background services, recovery orchestration
│   │   ├── integrations/        # graphiti/, linear, github
│   │   ├── project/             # Project analysis, security profiles
│   │   ├── merge/               # Intent-aware semantic merge for parallel agents
│   │   └── prompts/             # Agent system prompts (.md)
│   └── frontend/                # React web UI
│       └── src/
│           ├── renderer/        # React UI
│           │   ├── features/    # Feature modules (tasks, terminals, settings, etc.)
│           │   ├── shared/      # Shared components, hooks, lib
│           │   │   └── lib/     # api-client.ts, store-adapter.ts
│           │   ├── stores/      # 24+ Zustand state stores
│           │   └── App.tsx      # Root component
│           └── shared/          # Shared types, i18n, constants, utils
│               ├── i18n/locales/# en/*.json, fr/*.json
│               ├── constants/   # themes.ts, etc.
│               ├── types/       # Type definition files
│               └── utils/       # ANSI sanitizer, shell escape, provider detection
├── guides/                      # Documentation
├── tests/                       # Backend test suite
└── scripts/                     # Build and utility scripts
```

## Commands Quick Reference

### Setup
```bash
npm run install:all              # Install all dependencies from root
# Or separately:
cd apps/backend && uv venv && uv pip install -r requirements.txt
cd apps/frontend && npm install
```

### Running the Application
```bash
# Web mode (recommended)
./start-web.sh                   # Build frontend and start web server
./start-web.sh --port 8080       # Custom port

# Development mode (separate terminals)
# Terminal 1: Backend API
cd apps/backend && uvicorn web.app:create_app --factory --reload

# Terminal 2: Frontend dev server
cd apps/frontend && npm run dev

# CLI only
cd apps/backend && python run.py --spec 001
```

### Testing

| Stack | Command | Tool |
|-------|---------|------|
| Backend | `apps/backend/.venv/bin/pytest tests/ -v` | pytest |
| Frontend unit | `cd apps/frontend && npm test` | Vitest |
| All backend | `npm run test:backend` (from root) | pytest |

### Releases
```bash
node scripts/bump-version.js patch|minor|major  # Bump version
git push && gh pr create --base main             # PR to main triggers release
```

See [RELEASE.md](RELEASE.md) for full release process.

## Backend Development

### Claude Agent SDK Usage

Client: `apps/backend/core/client.py` — `create_client()` returns a configured `ClaudeSDKClient` with security hooks, tool permissions, and MCP server integration.

Model and thinking level are user-configurable (via the web UI settings or CLI override). Use `phase_config.py` helpers to resolve the correct values.

### Web Server (`apps/backend/web/`)

FastAPI-based REST/WebSocket API:

- **`app.py`** — Application factory, CORS config, static file serving
- **`routers/`** — API endpoints for projects, tasks, terminals, github, gitlab, insights, roadmap, settings, profiles, context
- **`services/event_bus.py`** — WebSocket event broadcasting
- **`services/pty_manager.py`** — PTY process management for terminals

API documentation available at `/api/docs` when running the server.

### Agent Prompts (`apps/backend/prompts/`)

| Prompt | Purpose |
|--------|---------|
| planner.md | Implementation plan with subtasks |
| coder.md / coder_recovery.md | Subtask implementation / recovery |
| qa_reviewer.md / qa_fixer.md | Acceptance validation / issue fixes |
| spec_gatherer/researcher/writer/critic.md | Spec creation pipeline |
| complexity_assessor.md | AI-based complexity assessment |

### Spec Directory Structure

Each spec in `.auto-claude/specs/XXX-name/` contains: `spec.md`, `requirements.json`, `context.json`, `implementation_plan.json`, `qa_report.md`, `QA_FIX_REQUEST.md`

### Memory System (Graphiti)

Graph-based semantic memory in `integrations/graphiti/`. Configured through the web UI's onboarding/settings (CLI users can alternatively set `GRAPHITI_ENABLED=true` in `.env`).

## Frontend Development

### Tech Stack

React 19, TypeScript (strict), Zustand 5, Tailwind CSS v4, Radix UI, xterm.js 6, Vite 7, Vitest 4, Biome 2, Motion (Framer Motion)

### Path Aliases (tsconfig.json)

| Alias | Maps to |
|-------|---------|
| `@/*` | `src/renderer/*` |
| `@shared/*` | `src/shared/*` |
| `@features/*` | `src/renderer/features/*` |
| `@components/*` | `src/renderer/shared/components/*` |
| `@hooks/*` | `src/renderer/shared/hooks/*` |
| `@lib/*` | `src/renderer/shared/lib/*` |

### API Integration

The frontend uses a unified API layer via `store-adapter.ts`:

```typescript
import { api } from '@/lib/store-adapter';

// Projects
const projects = await api.project.list();
await api.project.add('/path/to/repo');

// Tasks
const tasks = await api.task.list(projectId);
await api.task.create({ title: '...', description: '...' });
await api.task.start(taskId);

// Terminals
const terminal = await api.terminal.create({ cwd: '/path' });
const ws = api.terminal.connectWebSocket(terminal.id);

// Settings
const settings = await api.settings.get();
await api.settings.save({ theme: 'dark' });
```

### State Management (Zustand)

All state lives in `src/renderer/stores/`. Key stores:

- `project-store.ts` — Active project, project list
- `task-store.ts` — Tasks/specs management
- `terminal-store.ts` — Terminal sessions and state
- `settings-store.ts` — User preferences
- `github/issues-store.ts`, `github/pr-review-store.ts` — GitHub integration
- `insights-store.ts`, `roadmap-store.ts`, `kanban-settings-store.ts`

### Styling

- **Tailwind CSS v4** with `@tailwindcss/postcss` plugin
- **7 color themes** (Default, Dusk, Lime, Ocean, Retro, Neo + more) defined in `src/shared/constants/themes.ts`
- Each theme has light/dark mode variants via CSS custom properties
- Utility: `clsx` + `tailwind-merge` via `cn()` helper
- Component variants: `class-variance-authority` (CVA)

### Terminal System

Full PTY-based terminal integration via WebSocket:
- **Backend**: `apps/backend/web/services/pty-manager.ts` — PTY process management
- **Frontend**: xterm.js 6 with WebGL, fit, web-links, serialize addons
- **Communication**: WebSocket for real-time terminal I/O

## Code Quality

### Frontend
- **Linting:** Biome (`npm run lint` / `npm run lint:fix`)
- **Type checking:** `npm run typecheck` (strict mode)
- **Pre-commit:** Husky + lint-staged runs Biome on staged `.ts/.tsx/.js/.jsx/.json`
- **Testing:** Vitest + React Testing Library + jsdom

### Backend
- **Linting:** Ruff
- **Testing:** pytest (`apps/backend/.venv/bin/pytest tests/ -v`)

## i18n Guidelines

All frontend UI text uses `react-i18next`. Translation files: `apps/frontend/src/shared/i18n/locales/{en,fr}/*.json`

**Namespaces:** `common`, `navigation`, `settings`, `dialogs`, `tasks`, `errors`, `onboarding`, `welcome`

```tsx
import { useTranslation } from 'react-i18next';
const { t } = useTranslation(['navigation', 'common']);

<span>{t('navigation:items.githubPRs')}</span>     // CORRECT
<span>GitHub PRs</span>                             // WRONG

// With interpolation:
<span>{t('errors:task.parseError', { error })}</span>
```

When adding new UI text: add keys to ALL language files, use `namespace:section.key` format.

## Cross-Platform

Supports Windows, macOS, Linux. CI tests all three.

**Platform modules:** `apps/backend/core/platform/`

| Function | Purpose |
|----------|---------|
| `isWindows()` / `isMacOS()` / `isLinux()` | OS detection |
| `getPathDelimiter()` | `;` (Win) or `:` (Unix) |
| `findExecutable(name)` | Cross-platform executable lookup |
| `requiresShell(command)` | `.cmd/.bat` shell detection (Win) |

Use `findExecutable()` and `joinPaths()` instead of hardcoded paths.

## Running the Application

```bash
# Web mode (recommended)
./start-web.sh                   # Build frontend and start web server

# Development mode (separate processes)
# Terminal 1 - Backend API:
cd apps/backend && uvicorn web.app:create_app --factory --reload

# Terminal 2 - Frontend dev server:
cd apps/frontend && npm run dev

# CLI mode
cd apps/backend && python run.py --spec 001

# Project data: .auto-claude/specs/ (gitignored)
```
