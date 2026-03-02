/**
 * HTTP API Client
 * ================
 *
 * Replaces window.electronAPI with HTTP/WebSocket calls to the FastAPI backend.
 * This module provides the same interface as the Electron IPC for seamless migration.
 */

// API base URL - defaults to same origin in production
const API_BASE = (typeof window !== 'undefined' && window.location?.origin) || 'http://127.0.0.1:3000';

/**
 * Make an API request
 */
async function apiRequest<T>(
  method: string,
  path: string,
  data?: unknown,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================================
// Project API
// ============================================

export const projectApi = {
  list: () => apiRequest<any[]>('GET', '/projects'),

  add: (projectPath: string) =>
    apiRequest<any>('POST', '/projects', { projectPath }),

  remove: (projectId: string) =>
    apiRequest<void>('DELETE', `/projects/${projectId}`),

  updateSettings: (projectId: string, settings: any) =>
    apiRequest<void>('PATCH', `/projects/${projectId}/settings`, settings),

  initialize: (projectId: string) =>
    apiRequest<any>('POST', `/projects/${projectId}/initialize`),

  checkVersion: (projectId: string) =>
    apiRequest<any>('GET', `/projects/${projectId}/check-version`),

  getTabState: () => apiRequest<any>('GET', '/projects/tab-state'),

  saveTabState: (state: any) =>
    apiRequest<void>('POST', '/projects/tab-state', state),

  getKanbanPrefs: (projectId: string) =>
    apiRequest<any>('GET', `/projects/${projectId}/kanban-prefs`),

  saveKanbanPrefs: (projectId: string, prefs: any) =>
    apiRequest<void>('POST', `/projects/${projectId}/kanban-prefs`, prefs),

  // Git operations
  getBranches: (projectPath: string) =>
    apiRequest<string[]>('GET', `/projects/${projectPath}/git/branches`),

  getBranchesWithInfo: (projectPath: string) =>
    apiRequest<any[]>('GET', `/projects/${projectPath}/git/branches-with-info`),

  getCurrentBranch: (projectPath: string) =>
    apiRequest<string>('GET', `/projects/${projectPath}/git/current-branch`),

  detectMainBranch: (projectPath: string) =>
    apiRequest<string>('GET', `/projects/${projectPath}/git/detect-main-branch`),

  checkGitStatus: (projectPath: string) =>
    apiRequest<any>('GET', `/projects/${projectPath}/git/status`),

  initializeGit: (projectPath: string) =>
    apiRequest<any>('POST', `/projects/${projectPath}/git/initialize`),
};

// ============================================
// Task API
// ============================================

export const taskApi = {
  list: (projectId?: string) =>
    apiRequest<any[]>('GET', `/tasks?projectId=${projectId || ''}`),

  create: (data: any) => apiRequest<any>('POST', '/tasks', data),

  get: (taskId: string) => apiRequest<any>('GET', `/tasks/${taskId}`),

  update: (taskId: string, data: any) =>
    apiRequest<any>('PATCH', `/tasks/${taskId}`, data),

  delete: (taskId: string) => apiRequest<void>('DELETE', `/tasks/${taskId}`),

  start: (taskId: string) => apiRequest<any>('POST', `/tasks/${taskId}/start`),

  stop: (taskId: string) => apiRequest<any>('POST', `/tasks/${taskId}/stop`),

  review: (taskId: string) => apiRequest<any>('POST', `/tasks/${taskId}/review`),

  updateStatus: (taskId: string, status: string) =>
    apiRequest<any>('PATCH', `/tasks/${taskId}/status`, { status }),

  recoverStuck: (taskId: string) =>
    apiRequest<any>('POST', `/tasks/${taskId}/recover-stuck`),

  resumePaused: (taskId: string) =>
    apiRequest<any>('POST', `/tasks/${taskId}/resume-paused`),

  getLogs: (taskId: string) =>
    apiRequest<any[]>('GET', `/tasks/${taskId}/logs`),

  // Worktree operations
  getWorktreeStatus: (taskId: string) =>
    apiRequest<any>('GET', `/tasks/${taskId}/worktree/status`),

  getWorktreeDiff: (taskId: string) =>
    apiRequest<string>('GET', `/tasks/${taskId}/worktree/diff`),

  mergeWorktree: (taskId: string) =>
    apiRequest<void>('POST', `/tasks/${taskId}/worktree/merge`),

  discardWorktree: (taskId: string) =>
    apiRequest<void>('POST', `/tasks/${taskId}/worktree/discard`),

  createPR: (taskId: string, options?: any) =>
    apiRequest<any>('POST', `/tasks/${taskId}/worktree/create-pr`, options),

  archive: (taskId: string) =>
    apiRequest<void>('POST', `/tasks/${taskId}/archive`),

  unarchive: (taskId: string) =>
    apiRequest<void>('POST', `/tasks/${taskId}/unarchive`),
};

// ============================================
// Terminal API
// ============================================

export const terminalApi = {
  create: (data: any) => apiRequest<any>('POST', '/terminals', data),

  destroy: (terminalId: string) =>
    apiRequest<void>('DELETE', `/terminals/${terminalId}`),

  getSessions: () => apiRequest<any[]>('GET', '/terminals'),

  sendInput: (terminalId: string, data: string) =>
    apiRequest<void>('POST', `/terminals/${terminalId}/input`, { data }),

  resize: (terminalId: string, cols: number, rows: number) =>
    apiRequest<void>('POST', `/terminals/${terminalId}/resize`, { cols, rows }),

  setTitle: (terminalId: string, title: string) =>
    apiRequest<void>('POST', `/terminals/${terminalId}/title`, { title }),

  setWorktreeConfig: (terminalId: string, worktreePath: string | null, worktreeBranch: string | null) =>
    apiRequest<void>('POST', `/terminals/${terminalId}/worktree-config`, {
      worktreePath,
      worktreeBranch,
    }),

  createWorktree: (terminalId: string, branchName: string, basePath?: string) =>
    apiRequest<any>('POST', `/terminals/${terminalId}/worktree`, {
      branchName,
      basePath,
    }),

  removeWorktree: (terminalId: string) =>
    apiRequest<void>('DELETE', `/terminals/${terminalId}/worktree`),

  connectWebSocket: (terminalId: string): WebSocket => {
    const wsProtocol = API_BASE.startsWith('https') ? 'wss' : 'ws';
    const wsHost = API_BASE.replace(/^https?:\/\//, '');
    return new WebSocket(`${wsProtocol}://${wsHost}/api/terminals/ws/${terminalId}`);
  },
};

// ============================================
// Settings API
// ============================================

export const settingsApi = {
  get: () => apiRequest<any>('GET', '/settings'),

  save: (settings: any) => apiRequest<void>('POST', '/settings', settings),

  update: (settings: any) => apiRequest<any>('PATCH', '/settings', settings),

  getCliToolsInfo: () => apiRequest<any>('GET', '/settings/cli-tools-info'),

  getClaudeCodeOnboardingStatus: () =>
    apiRequest<any>('GET', '/settings/claude-code/onboarding-status'),
};

// ============================================
// Profile API
// ============================================

export const profileApi = {
  // Claude OAuth profiles
  getClaudeProfiles: () => apiRequest<any[]>('GET', '/profiles/claude'),

  saveClaudeProfile: (profile: any) =>
    apiRequest<any>('POST', '/profiles/claude', profile),

  deleteClaudeProfile: (profileId: string) =>
    apiRequest<void>('DELETE', `/profiles/claude/${profileId}`),

  renameClaudeProfile: (profileId: string, name: string) =>
    apiRequest<void>('POST', `/profiles/claude/${profileId}/rename`, { name }),

  setActiveClaudeProfile: (profileId: string) =>
    apiRequest<void>('POST', `/profiles/claude/${profileId}/set-active`),

  switchClaudeProfile: (profileId: string) =>
    apiRequest<any>('POST', `/profiles/claude/${profileId}/switch`),

  // API profiles (custom endpoints)
  getAPIProfiles: () => apiRequest<any>('GET', '/profiles/api'),

  saveAPIProfile: (profile: any) =>
    apiRequest<any>('POST', '/profiles/api', profile),

  updateAPIProfile: (profileId: string, updates: any) =>
    apiRequest<any>('PATCH', `/profiles/api/${profileId}`, updates),

  deleteAPIProfile: (profileId: string) =>
    apiRequest<void>('DELETE', `/profiles/api/${profileId}`),

  setActiveAPIProfile: (profileId: string | null) =>
    apiRequest<void>('POST', `/profiles/api/${profileId}/set-active`),

  testConnection: (baseUrl: string, apiKey: string) =>
    apiRequest<any>('POST', '/profiles/api/test-connection', { baseUrl, apiKey }),

  discoverModels: (baseUrl: string, apiKey: string) =>
    apiRequest<any>('POST', '/profiles/api/discover-models', { baseUrl, apiKey }),

  // Account priority
  getAccountPriority: () => apiRequest<string[]>('GET', '/profiles/priority'),

  setAccountPriority: (priority: string[]) =>
    apiRequest<void>('POST', '/profiles/priority', priority),

  // Auto-switch settings
  getAutoSwitchSettings: () => apiRequest<any>('GET', '/profiles/auto-switch'),

  updateAutoSwitchSettings: (settings: any) =>
    apiRequest<void>('POST', '/profiles/auto-switch', settings),

  // Usage
  getUsage: () => apiRequest<any>('GET', '/profiles/usage'),

  getAllProfilesUsage: () => apiRequest<any>('GET', '/profiles/usage/all'),

  getBestProfile: () => apiRequest<any>('GET', '/profiles/best'),
};

// ============================================
// Context API
// ============================================

export const contextApi = {
  get: (projectId?: string) =>
    apiRequest<any>('GET', `/context?projectId=${projectId || ''}`),

  refreshIndex: (projectId: string) =>
    apiRequest<void>('POST', `/context/refresh-index`, { projectId }),

  getMemoryStatus: () => apiRequest<any>('GET', '/context/memory/status'),

  searchMemories: (query: string, limit?: number) =>
    apiRequest<any[]>('POST', '/context/memory/search', { query, limit }),

  getMemories: (projectId?: string) =>
    apiRequest<any[]>('GET', `/context/memory/list?projectId=${projectId || ''}`),
};

// ============================================
// Roadmap API
// ============================================

export const roadmapApi = {
  get: (projectId: string) => apiRequest<any>('GET', `/roadmap/${projectId}`),

  getStatus: (projectId: string) =>
    apiRequest<any>('GET', `/roadmap/${projectId}/status`),

  save: (projectId: string, roadmap: any) =>
    apiRequest<void>('POST', `/roadmap/${projectId}`, roadmap),

  generate: (projectId: string, enableCompetitorAnalysis?: boolean) =>
    apiRequest<void>('POST', `/roadmap/${projectId}/generate`, {
      enableCompetitorAnalysis,
    }),

  refresh: (projectId: string) =>
    apiRequest<void>('POST', `/roadmap/${projectId}/refresh`),

  stop: (projectId: string) =>
    apiRequest<void>('POST', `/roadmap/${projectId}/stop`),

  updateFeature: (projectId: string, featureId: string, updates: any) =>
    apiRequest<void>('PATCH', `/roadmap/${projectId}/features/${featureId}`, updates),

  convertToSpec: (projectId: string, featureId: string) =>
    apiRequest<any>('POST', `/roadmap/${projectId}/features/${featureId}/convert-to-spec`),

  saveCompetitorAnalysis: (projectId: string, analysis: any) =>
    apiRequest<void>('POST', `/roadmap/${projectId}/competitor-analysis`, analysis),
};

// ============================================
// Insights API
// ============================================

export const insightsApi = {
  listSessions: (projectId?: string) =>
    apiRequest<any[]>('GET', `/insights/sessions?projectId=${projectId || ''}`),

  getSession: (sessionId: string) =>
    apiRequest<any>('GET', `/insights/sessions/${sessionId}`),

  createSession: (projectId: string, title?: string) =>
    apiRequest<any>('POST', '/insights/sessions', { projectId, title }),

  clearSession: (sessionId: string) =>
    apiRequest<void>('POST', `/insights/sessions/${sessionId}/clear`),

  deleteSession: (sessionId: string) =>
    apiRequest<void>('DELETE', `/insights/sessions/${sessionId}`),

  deleteSessions: (sessionIds: string[]) =>
    apiRequest<void>('POST', '/insights/sessions/delete-batch', sessionIds),

  archiveSession: (sessionId: string) =>
    apiRequest<void>('POST', `/insights/sessions/${sessionId}/archive`),

  archiveSessions: (sessionIds: string[]) =>
    apiRequest<void>('POST', '/insights/sessions/archive-batch', sessionIds),

  unarchiveSession: (sessionId: string) =>
    apiRequest<void>('POST', `/insights/sessions/${sessionId}/unarchive`),

  renameSession: (sessionId: string, title: string) =>
    apiRequest<void>('PATCH', `/insights/sessions/${sessionId}/rename`, { title }),

  updateModelConfig: (sessionId: string, config: any) =>
    apiRequest<void>('PATCH', `/insights/sessions/${sessionId}/model-config`, config),

  switchSession: (sessionId: string) =>
    apiRequest<any>('POST', `/insights/sessions/${sessionId}/switch`),

  sendMessage: (sessionId: string, content: string) =>
    apiRequest<any>('POST', `/insights/sessions/${sessionId}/messages`, { content }),

  createTask: (sessionId: string, messageId: string) =>
    apiRequest<any>('POST', `/insights/sessions/${sessionId}/create-task`, { messageId }),
};

// ============================================
// GitHub API
// ============================================

export const githubApi = {
  getRepositories: () => apiRequest<any[]>('GET', '/github/repositories'),

  checkConnection: (projectId?: string) =>
    apiRequest<any>('GET', `/github/connection?projectId=${projectId || ''}`),

  getIssues: (projectId: string, options?: any) =>
    apiRequest<any>('GET', `/github/issues?projectId=${projectId}&${new URLSearchParams(options || {})}`),

  getIssue: (projectId: string, issueNumber: number) =>
    apiRequest<any>('GET', `/github/issues/${issueNumber}?projectId=${projectId}`),

  getIssueComments: (projectId: string, issueNumber: number) =>
    apiRequest<any[]>('GET', `/github/issues/${issueNumber}/comments?projectId=${projectId}`),

  importIssues: (projectId: string, issueNumbers: number[]) =>
    apiRequest<any>('POST', '/github/issues/import', { projectId, issueNumbers }),

  // CLI authentication
  checkCli: () => apiRequest<any>('GET', '/github/cli'),

  checkAuth: () => apiRequest<any>('GET', '/github/auth'),

  startAuth: () => apiRequest<any>('POST', '/github/auth/start'),

  getUser: () => apiRequest<any>('GET', '/github/auth/user'),

  listUserRepos: () => apiRequest<any>('GET', '/github/user/repos'),

  // PR operations
  listPRs: (projectId: string, options?: any) =>
    apiRequest<any>('GET', `/github/prs?projectId=${projectId}&${new URLSearchParams(options || {})}`),

  getPR: (projectId: string, prNumber: number) =>
    apiRequest<any>('GET', `/github/prs/${prNumber}?projectId=${projectId}`),

  getPRDiff: (projectId: string, prNumber: number) =>
    apiRequest<string>('GET', `/github/prs/${prNumber}/diff?projectId=${projectId}`),

  runPRReview: (projectId: string, prNumber: number) =>
    apiRequest<void>('POST', `/github/prs/${prNumber}/review`, { projectId }),

  cancelPRReview: (projectId: string, prNumber: number) =>
    apiRequest<void>('POST', `/github/prs/${prNumber}/review/cancel`, { projectId }),

  getPRReview: (projectId: string, prNumber: number) =>
    apiRequest<any>('GET', `/github/prs/${prNumber}/review?projectId=${projectId}`),

  postPRReview: (projectId: string, prNumber: number) =>
    apiRequest<void>('POST', `/github/prs/${prNumber}/post-review`, { projectId }),

  mergePR: (projectId: string, prNumber: number) =>
    apiRequest<void>('POST', `/github/prs/${prNumber}/merge`, { projectId }),

  // Auto-fix
  getAutoFixConfig: (projectId: string) =>
    apiRequest<any>('GET', `/github/autofix/config?projectId=${projectId}`),

  saveAutoFixConfig: (projectId: string, config: any) =>
    apiRequest<void>('POST', `/github/autofix/config`, { projectId, config }),

  startAutoFix: (projectId: string, issueNumbers: number[]) =>
    apiRequest<void>('POST', '/github/autofix/start', { projectId, issueNumbers }),

  // Release
  createRelease: (projectId: string, options: any) =>
    apiRequest<any>('POST', '/github/release', { projectId, ...options }),

  suggestVersion: (projectId: string) =>
    apiRequest<any>('GET', `/github/release/suggest-version?projectId=${projectId}`),
};

// ============================================
// GitLab API
// ============================================

export const gitlabApi = {
  getProjects: () => apiRequest<any[]>('GET', '/gitlab/projects'),

  checkConnection: (projectId?: string) =>
    apiRequest<any>('GET', `/gitlab/connection?projectId=${projectId || ''}`),

  getIssues: (projectId: string, options?: any) =>
    apiRequest<any>('GET', `/gitlab/issues?projectId=${projectId}&${new URLSearchParams(options || {})}`),

  getIssue: (projectId: string, issueIid: number) =>
    apiRequest<any>('GET', `/gitlab/issues/${issueIid}?projectId=${projectId}`),

  importIssues: (projectId: string, issueIids: number[]) =>
    apiRequest<any>('POST', '/gitlab/issues/import', { projectId, issueIids }),

  // CLI authentication
  checkCli: () => apiRequest<any>('GET', '/gitlab/cli'),

  checkAuth: () => apiRequest<any>('GET', '/gitlab/auth'),

  startAuth: () => apiRequest<any>('POST', '/gitlab/auth/start'),

  getUser: () => apiRequest<any>('GET', '/gitlab/auth/user'),

  // MR operations
  listMRs: (projectId: string, options?: any) =>
    apiRequest<any>('GET', `/gitlab/mrs?projectId=${projectId}&${new URLSearchParams(options || {})}`),

  getMR: (projectId: string, mrIid: number) =>
    apiRequest<any>('GET', `/gitlab/mrs/${mrIid}?projectId=${projectId}`),

  createMR: (projectId: string, options: any) =>
    apiRequest<any>('POST', '/gitlab/mrs', { projectId, ...options }),

  runMRReview: (projectId: string, mrIid: number) =>
    apiRequest<void>('POST', `/gitlab/mrs/${mrIid}/review`, { projectId }),

  mergeMR: (projectId: string, mrIid: number) =>
    apiRequest<void>('POST', `/gitlab/mrs/${mrIid}/merge`, { projectId }),
};

// ============================================
// Event Subscriptions (WebSocket)
// ============================================

type EventHandler = (data: any) => void;

class EventSubscription {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(url?: string): void {
    const wsProtocol = API_BASE.startsWith('https') ? 'wss' : 'ws';
    const wsHost = API_BASE.replace(/^https?:\/\//, '');
    const wsUrl = url || `${wsProtocol}://${wsHost}/api/events`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const handlers = this.handlers.get(message.type);
        if (handlers) {
          handlers.forEach(handler => handler(message.data));
        }
      } catch (error) {
        console.error('Failed to parse event message:', error);
      }
    };

    this.ws.onclose = () => {
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
  }
}

export const eventSubscription = new EventSubscription();

// ============================================
// Unified API Export
// ============================================

export const apiClient = {
  project: projectApi,
  task: taskApi,
  terminal: terminalApi,
  settings: settingsApi,
  profile: profileApi,
  context: contextApi,
  roadmap: roadmapApi,
  insights: insightsApi,
  github: githubApi,
  gitlab: gitlabApi,
  events: eventSubscription,
};

export default apiClient;
