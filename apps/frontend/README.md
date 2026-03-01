# Auto Claude UI - Frontend

A modern React web application for the Auto Claude autonomous coding framework.

## Prerequisites

### Node.js 20+ (Required)

This project requires **Node.js 20+**.

**Download:** https://nodejs.org/en/download/

**Or install via command line:**

**Windows:**
```bash
winget install OpenJS.NodeJS.LTS
```

**macOS:**
```bash
brew install node@22
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

**Linux (Fedora):**
```bash
sudo dnf install nodejs npm
```

**Verify installation:**
```bash
node --version  # Should output: v20.x.x or higher
npm --version   # Should output: 10.x.x or higher
```

## Quick Start

```bash
# Navigate to frontend directory
cd apps/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The development server runs on `http://localhost:5173` with hot module replacement.

## Architecture

This project follows a **feature-based architecture** for better maintainability and scalability.

```
src/
├── renderer/                # React frontend
│   ├── features/            # Feature modules (self-contained)
│   │   ├── tasks/           # Task management, kanban, creation
│   │   ├── terminals/       # Terminal emulation
│   │   ├── projects/        # Project management, file explorer
│   │   ├── settings/        # App and project settings
│   │   ├── roadmap/         # Roadmap generation
│   │   ├── ideation/        # AI-powered brainstorming
│   │   ├── insights/        # Code analysis
│   │   ├── changelog/       # Release management
│   │   ├── github/          # GitHub integration
│   │   ├── agents/          # Claude profile management
│   │   ├── worktrees/       # Git worktree management
│   │   └── onboarding/      # First-time setup wizard
│   │
│   ├── shared/              # Shared resources
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/           # Shared React hooks
│   │   └── lib/             # Utilities and helpers
│   │       ├── api-client.ts    # HTTP/WebSocket client
│   │       └── store-adapter.ts # Unified API abstraction
│   │
│   └── hooks/               # App-level hooks
│
└── shared/                  # Shared types and utilities
    ├── types/               # TypeScript type definitions
    ├── constants/           # Application constants
    └── utils/               # Shared utilities
```

## API Integration

The frontend uses a unified API layer that supports both HTTP (web) environments:

```typescript
import { api } from '@/lib/store-adapter';

// Works in both environments
const projects = await api.project.list();
const tasks = await api.task.list(projectId);
```

See `src/renderer/lib/store-adapter.ts` and `src/renderer/lib/api-client.ts` for the full API.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (outputs to `../backend/web/static/`) |
| `npm run preview` | Preview production build locally |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Check for lint errors |
| `npm run lint:fix` | Auto-fix lint errors |
| `npm run typecheck` | Type check TypeScript |

## Development Guidelines

### Code Organization Principles

1. **Feature-based Architecture**: Group related code by feature, not by type
2. **Single Responsibility**: Each component/hook/store does one thing well
3. **DRY (Don't Repeat Yourself)**: Extract reusable logic into shared modules
4. **KISS (Keep It Simple)**: Prefer simple solutions over complex ones
5. **SOLID Principles**: Apply object-oriented design principles

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `TaskCard.tsx` |
| Hooks | camelCase with `use` prefix | `useTaskStore.ts` |
| Stores | kebab-case with `-store` suffix | `task-store.ts` |
| Types | PascalCase | `Task`, `TaskStatus` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES` |

### TypeScript Guidelines

- **No implicit `any`**: Always type your variables and parameters
- **Use `type` for simple objects**: Prefer `type` over `interface`
- **Export types separately**: Use `export type` for type-only exports

### Security Guidelines

- **Never expose secrets**: API keys, tokens should stay on the backend
- **Validate API responses**: Always validate data coming from the API
- **Use HTTPS in production**: Ensure the backend is served over HTTPS

## Troubleshooting

### npm not found

If `npm` command is not recognized after installing Node.js:

1. **Windows**: Reinstall Node.js from https://nodejs.org and ensure you check "Add to PATH"
2. **macOS/Linux**: Add to your shell profile:
   ```bash
   export PATH="/usr/local/bin:$PATH"
   ```
3. Restart your terminal

### API connection issues

If the frontend can't connect to the backend:

1. Ensure the backend server is running on the correct port
2. Check CORS settings in the backend
3. Verify the API base URL in `api-client.ts`

## Git Hooks

This project uses Husky for Git hooks that run automatically:

### Pre-commit Hook

Runs before each commit:
- **lint-staged**: Lints staged `.ts`/`.tsx` files
- **typecheck**: TypeScript type checking
- **lint**: Biome lint checks

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/). Your commit messages must follow this format:

```
type(scope): description
```

**Valid types:**
| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes |
| `style` | Code style (formatting, semicolons, etc.) |
| `refactor` | Code refactoring (no feature/fix) |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `build` | Build system or dependencies |
| `ci` | CI/CD configuration |
| `chore` | Maintenance tasks |
| `revert` | Reverting a previous commit |

**Examples:**
```bash
git commit -m "feat(tasks): add drag and drop support"
git commit -m "fix(terminal): resolve scroll position issue"
git commit -m "docs: update README with setup instructions"
git commit -m "chore: update dependencies"
```

## Package Manager

This project uses **npm** (not pnpm or yarn). The lock files for other package managers are ignored.

## License

AGPL-3.0
