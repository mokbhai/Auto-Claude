/**
 * Store Adapter Utility
 * =====================
 *
 * Provides a bridge between Electron IPC and the HTTP API client.
 * This allows stores to work with both Electron (desktop) and web (HTTP) backends.
 */

import { apiClient } from './api-client';

/**
 * Check if running in Electron environment
 */
export const isElectron = typeof window !== 'undefined' &&
  typeof (window as any).electronAPI !== 'undefined';

/**
 * Get the appropriate API based on environment
 */
export function getApi() {
  if (isElectron) {
    return (window as any).electronAPI;
  }
  return apiClient;
}

/**
 * Adapter for making API calls that work in both Electron and web
 */
export const api = {
  // Project API
  project: {
    async list() {
      const api = getApi();
      if (isElectron) {
        return api.listProjects();
      }
      return api.project.list();
    },

    async add(projectPath: string) {
      const api = getApi();
      if (isElectron) {
        return api.addProject(projectPath);
      }
      return api.project.add(projectPath);
    },

    async remove(projectId: string) {
      const api = getApi();
      if (isElectron) {
        return api.removeProject(projectId);
      }
      return api.project.remove(projectId);
    },

    async updateSettings(projectId: string, settings: any) {
      const api = getApi();
      if (isElectron) {
        return api.updateProjectSettings(projectId, settings);
      }
      return api.project.updateSettings(projectId, settings);
    },

    async initialize(projectId: string) {
      const api = getApi();
      if (isElectron) {
        return api.initializeProject(projectId);
      }
      return api.project.initialize(projectId);
    },
  },

  // Task API
  task: {
    async list(projectId?: string) {
      const api = getApi();
      if (isElectron) {
        return api.listTasks(projectId);
      }
      return api.task.list(projectId);
    },

    async create(data: any) {
      const api = getApi();
      if (isElectron) {
        return api.createTask(data);
      }
      return api.task.create(data);
    },

    async delete(taskId: string) {
      const api = getApi();
      if (isElectron) {
        return api.deleteTask(taskId);
      }
      return api.task.delete(taskId);
    },

    async update(taskId: string, data: any) {
      const api = getApi();
      if (isElectron) {
        return api.updateTask(taskId, data);
      }
      return api.task.update(taskId, data);
    },

    async start(taskId: string) {
      const api = getApi();
      if (isElectron) {
        return api.startTask(taskId);
      }
      return api.task.start(taskId);
    },

    async stop(taskId: string) {
      const api = getApi();
      if (isElectron) {
        return api.stopTask(taskId);
      }
      return api.task.stop(taskId);
    },

    async getWorktreeStatus(taskId: string) {
      const api = getApi();
      if (isElectron) {
        return api.getWorktreeStatus(taskId);
      }
      return api.task.getWorktreeStatus(taskId);
    },

    async mergeWorktree(taskId: string, baseBranch?: string, noCommit?: boolean) {
      const api = getApi();
      if (isElectron) {
        return api.mergeWorktree(taskId, baseBranch, noCommit);
      }
      return api.task.mergeWorktree(taskId);
    },

    async discardWorktree(taskId: string) {
      const api = getApi();
      if (isElectron) {
        return api.discardWorktree(taskId);
      }
      return api.task.discardWorktree(taskId);
    },
  },

  // Terminal API
  terminal: {
    async create(options: any) {
      const api = getApi();
      if (isElectron) {
        return api.createTerminal(options);
      }
      return api.terminal.create(options);
    },

    async destroy(terminalId: string) {
      const api = getApi();
      if (isElectron) {
        return api.destroyTerminal(terminalId);
      }
      return api.terminal.destroy(terminalId);
    },

    async getSessions() {
      const api = getApi();
      if (isElectron) {
        return api.getTerminalSessions();
      }
      return api.terminal.getSessions();
    },

    async sendInput(terminalId: string, data: string) {
      const api = getApi();
      if (isElectron) {
        return api.sendTerminalInput(terminalId, data);
      }
      return api.terminal.sendInput(terminalId, data);
    },

    async resize(terminalId: string, cols: number, rows: number) {
      const api = getApi();
      if (isElectron) {
        return api.resizeTerminal(terminalId, cols, rows);
      }
      return api.terminal.resize(terminalId, cols, rows);
    },

    connectWebSocket(terminalId: string): WebSocket | null {
      if (isElectron) {
        // In Electron, terminal I/O is handled via IPC events
        return null;
      }
      return api.terminal.connectWebSocket(terminalId);
    },
  },

  // Settings API
  settings: {
    async get() {
      const api = getApi();
      if (isElectron) {
        return api.getSettings();
      }
      return api.settings.get();
    },

    async save(settings: any) {
      const api = getApi();
      if (isElectron) {
        return api.saveSettings(settings);
      }
      return api.settings.save(settings);
    },
  },

  // Profile API
  profile: {
    async getClaudeProfiles() {
      const api = getApi();
      if (isElectron) {
        return api.getClaudeProfiles();
      }
      return api.profile.getClaudeProfiles();
    },

    async saveClaudeProfile(profile: any) {
      const api = getApi();
      if (isElectron) {
        return api.saveClaudeProfile(profile);
      }
      return api.profile.saveClaudeProfile(profile);
    },

    async switchClaudeProfile(profileId: string) {
      const api = getApi();
      if (isElectron) {
        return api.switchClaudeProfile(profileId);
      }
      return api.profile.switchClaudeProfile(profileId);
    },

    async getAPIProfiles() {
      const api = getApi();
      if (isElectron) {
        return api.getAPIProfiles();
      }
      return api.profile.getAPIProfiles();
    },
  },

  // Context API
  context: {
    async get(projectId: string) {
      const api = getApi();
      if (isElectron) {
        return api.getContext(projectId);
      }
      return api.context.get(projectId);
    },

    async refreshIndex(projectId: string) {
      const api = getApi();
      if (isElectron) {
        return api.refreshContextIndex(projectId);
      }
      return api.context.refreshIndex(projectId);
    },
  },

  // Roadmap API
  roadmap: {
    async get(projectId: string) {
      const api = getApi();
      if (isElectron) {
        return api.getRoadmap(projectId);
      }
      return api.roadmap.get(projectId);
    },

    async save(projectId: string, roadmap: any) {
      const api = getApi();
      if (isElectron) {
        return api.saveRoadmap(projectId, roadmap);
      }
      return api.roadmap.save(projectId, roadmap);
    },

    async generate(projectId: string, enableCompetitorAnalysis?: boolean) {
      const api = getApi();
      if (isElectron) {
        return api.generateRoadmap(projectId, enableCompetitorAnalysis);
      }
      return api.roadmap.generate(projectId, enableCompetitorAnalysis);
    },
  },

  // Insights API
  insights: {
    async listSessions(projectId: string) {
      const api = getApi();
      if (isElectron) {
        return api.listInsightsSessions(projectId);
      }
      return api.insights.listSessions(projectId);
    },

    async createSession(projectId: string, title?: string) {
      const api = getApi();
      if (isElectron) {
        return api.newInsightsSession(projectId, title);
      }
      return api.insights.createSession(projectId, title);
    },

    async sendMessage(sessionId: string, content: string) {
      const api = getApi();
      if (isElectron) {
        return api.sendInsightsMessage(sessionId, content);
      }
      return api.insights.sendMessage(sessionId, content);
    },
  },

  // GitHub API
  github: {
    async checkConnection(projectId: string) {
      const api = getApi();
      if (isElectron) {
        return api.github.checkGitHubConnection(projectId);
      }
      return api.github.checkConnection(projectId);
    },

    async getIssues(projectId: string, options?: any) {
      const api = getApi();
      if (isElectron) {
        return api.github.getGitHubIssues(projectId, options);
      }
      return api.github.getIssues(projectId, options);
    },

    async listPRs(projectId: string, options?: any) {
      const api = getApi();
      if (isElectron) {
        return api.github.listPRs(projectId, options);
      }
      return api.github.listPRs(projectId, options);
    },
  },
};

/**
 * Event subscription adapter
 */
export function subscribeToEvent(eventType: string, handler: (data: any) => void): () => void {
  if (isElectron) {
    const api = (window as any).electronAPI;
    // Map event types to Electron IPC event handlers
    const eventHandlerMap: Record<string, () => () => void> = {
      'task:progress': () => api.onTaskProgress(handler),
      'task:statusChange': () => api.onTaskStatusChange(handler),
      'terminal:output': () => api.onTerminalOutput(handler),
      'roadmap:progress': () => api.onRoadmapProgress(handler),
      'insights:streamChunk': () => api.onInsightsStreamChunk(handler),
    };

    const eventHandler = eventHandlerMap[eventType];
    if (eventHandler) {
      return eventHandler();
    }
    return () => {};
  } else {
    // Web: use WebSocket events
    return apiClient.events.subscribe(eventType, handler);
  }
}

export default api;
