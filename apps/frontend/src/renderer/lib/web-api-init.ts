/**
 * Web API Initialization
 * ======================
 *
 * Replaces window.electronAPI with HTTP/WebSocket calls to the FastAPI backend.
 * This enables the app to work in any modern browser without Electron.
 */

import type { ElectronAPI } from '../../shared/types';
import { apiClient } from './api-client';

/**
 * Check if we're running in Electron
 */
const isElectron = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;

/**
 * Open a native folder picker dialog using the File System Access API
 */
async function selectDirectory(): Promise<string | null> {
  // Try the modern File System Access API first
  if ('showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });
      return dirHandle.name; // Returns the directory name
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return null; // User cancelled
      }
      console.error('Directory picker error:', err);
    }
  }

  // Fallback: Use input element with webkitdirectory
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.style.display = 'none';

    input.onchange = () => {
      const files = input.files;
      if (files && files.length > 0) {
        // Get the path from the first file's webkitRelativePath
        const relativePath = files[0].webkitRelativePath;
        const folderName = relativePath.split('/')[0];
        resolve(folderName);
      } else {
        resolve(null);
      }
      document.body.removeChild(input);
    };

    input.oncancel = () => {
      resolve(null);
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Create the web API that mimics Electron's electronAPI
 */
function createWebAPI(): ElectronAPI {
  return {
    // ============================================
    // Project Operations
    // ============================================
    listProjects: async () => apiClient.project.list(),
    addProject: async (projectPath: string) => apiClient.project.add(projectPath),
    removeProject: async (projectId: string) => apiClient.project.remove(projectId),
    updateProjectSettings: async (projectId: string, settings: any) =>
      apiClient.project.updateSettings(projectId, settings),
    initializeProject: async (projectId: string) => apiClient.project.initialize(projectId),
    checkProjectVersion: async (projectId: string) => apiClient.project.checkVersion(projectId),

    // Tab State
    getTabState: async () => apiClient.project.getTabState(),
    saveTabState: async (state: any) => apiClient.project.saveTabState(state),

    // Kanban Preferences
    getKanbanPrefs: async (projectId: string) => apiClient.project.getKanbanPrefs(projectId),
    saveKanbanPrefs: async (projectId: string, prefs: any) =>
      apiClient.project.saveKanbanPrefs(projectId, prefs),

    // Git Operations
    getBranches: async (projectPath: string) => apiClient.project.getBranches(projectPath),
    getBranchesWithInfo: async (projectPath: string) =>
      apiClient.project.getBranchesWithInfo(projectPath),
    getCurrentBranch: async (projectPath: string) =>
      apiClient.project.getCurrentBranch(projectPath),
    detectMainBranch: async (projectPath: string) =>
      apiClient.project.detectMainBranch(projectPath),
    checkGitStatus: async (projectPath: string) => apiClient.project.checkGitStatus(projectPath),
    initializeGit: async (projectPath: string) => apiClient.project.initializeGit(projectPath),

    // ============================================
    // Task Operations
    // ============================================
    listTasks: async (projectId?: string) => apiClient.task.list(projectId),
    createTask: async (data: any) => apiClient.task.create(data),
    getTask: async (taskId: string) => apiClient.task.get(taskId),
    updateTask: async (taskId: string, data: any) => apiClient.task.update(taskId, data),
    deleteTask: async (taskId: string) => apiClient.task.delete(taskId),
    startTask: async (taskId: string) => apiClient.task.start(taskId),
    stopTask: async (taskId: string) => apiClient.task.stop(taskId),
    reviewTask: async (taskId: string) => apiClient.task.review(taskId),
    updateTaskStatus: async (taskId: string, status: string) =>
      apiClient.task.updateStatus(taskId, status),
    recoverStuckTask: async (taskId: string) => apiClient.task.recoverStuck(taskId),
    resumePausedTask: async (taskId: string) => apiClient.task.resumePaused(taskId),
    archiveTask: async (taskId: string) => apiClient.task.archive(taskId),
    unarchiveTask: async (taskId: string) => apiClient.task.unarchive(taskId),

    // Task Logs
    getTaskLogs: async (taskId: string) => apiClient.task.getLogs(taskId),
    watchTaskLogs: async (_taskId: string) => {},
    unwatchTaskLogs: async (_taskId: string) => {},
    onTaskLogsChanged: () => () => {},
    onTaskLogsStream: () => () => {},

    // Task Events
    onTaskProgress: () => () => {},
    onTaskError: () => () => {},
    onTaskLog: () => () => {},
    onTaskStatusChange: () => () => {},
    onTaskExecutionProgress: () => () => {},

    // Worktree Operations
    getWorktreeStatus: async (taskId: string) => apiClient.task.getWorktreeStatus(taskId),
    getWorktreeDiff: async (taskId: string) => apiClient.task.getWorktreeDiff(taskId),
    mergeWorktree: async (taskId: string, _baseBranch?: string, _noCommit?: boolean) =>
      apiClient.task.mergeWorktree(taskId),
    getMergePreview: async (taskId: string) => ({ success: true, data: null }),
    discardWorktree: async (taskId: string) => apiClient.task.discardWorktree(taskId),
    discardOrphanWorktree: async (_specName: string) => ({ success: true }),
    createPRFromWorktree: async (taskId: string, options?: any) =>
      apiClient.task.createPR(taskId, options),
    openWorktreeInIDE: async (_taskId: string, _ide?: string) => ({ success: true }),
    openWorktreeInTerminal: async (_taskId: string) => ({ success: true }),
    detectWorktreeTools: async () => ({ success: true, data: { ides: [], terminals: [] } }),
    listWorktrees: async () => ({ success: true, data: [] }),
    clearStagedState: async (_taskId: string) => ({ success: true }),
    onMergeProgress: () => () => {},

    // ============================================
    // Terminal Operations
    // ============================================
    createTerminal: async (options: any) => apiClient.terminal.create(options),
    destroyTerminal: async (terminalId: string) => apiClient.terminal.destroy(terminalId),
    sendTerminalInput: async (terminalId: string, data: string) =>
      apiClient.terminal.sendInput(terminalId, data),
    resizeTerminal: async (terminalId: string, cols: number, rows: number) =>
      apiClient.terminal.resize(terminalId, cols, rows),
    invokeClaudeInTerminal: async (_terminalId: string, _options?: any) => ({ success: true }),
    generateTerminalName: async () => ({ success: true, data: 'Terminal' }),
    setTerminalTitle: async (terminalId: string, title: string) =>
      apiClient.terminal.setTitle(terminalId, title),
    setTerminalWorktreeConfig: async (
      terminalId: string,
      worktreePath: string | null,
      worktreeBranch: string | null
    ) => apiClient.terminal.setWorktreeConfig(terminalId, worktreePath, worktreeBranch),

    // Terminal Session Management
    getTerminalSessions: async () => apiClient.terminal.getSessions(),
    restoreTerminalSession: async (_sessionId: string) => ({ success: true, data: null }),
    clearTerminalSessions: async () => ({ success: true }),
    resumeClaudeInTerminal: async (_terminalId: string) => ({ success: true }),
    activateDeferredResume: async (_terminalId: string) => ({ success: true }),
    getTerminalSessionDates: async () => ({ success: true, data: [] }),
    getTerminalSessionsForDate: async (_date: string) => ({ success: true, data: [] }),
    restoreTerminalFromDate: async (_date: string, _sessionId: string) => ({
      success: true,
      data: null,
    }),
    checkPtyAlive: async (_terminalId: string) => ({ success: true, data: true }),
    updateTerminalDisplayOrders: async (_orders: any[]) => ({ success: true }),

    // Terminal Worktree Operations
    createTerminalWorktree: async (terminalId: string, branchName: string, basePath?: string) =>
      apiClient.terminal.createWorktree(terminalId, branchName, basePath),
    removeTerminalWorktree: async (terminalId: string) =>
      apiClient.terminal.removeWorktree(terminalId),
    listTerminalWorktrees: async () => apiClient.terminal.getSessions(),
    listOtherWorktrees: async () => ({ success: true, data: [] }),

    // Terminal Events
    onTerminalOutput: () => () => {},
    onTerminalExit: () => () => {},
    onTerminalTitleChange: () => () => {},
    onTerminalWorktreeConfigChange: () => () => {},
    onTerminalClaudeSession: () => () => {},
    onTerminalPendingResume: () => () => {},
    onTerminalRateLimit: () => () => {},
    onTerminalOAuthToken: () => () => {},
    onTerminalAuthCreated: () => () => {},
    onTerminalOAuthCodeNeeded: () => () => {},
    submitTerminalOAuthCode: async (_terminalId: string, _code: string) => ({ success: true }),
    onTerminalClaudeBusy: () => () => {},
    onTerminalClaudeExit: () => () => {},
    onTerminalOnboardingComplete: () => () => {},
    onTerminalProfileChanged: () => () => {},

    // ============================================
    // Claude Profile Management
    // ============================================
    getClaudeProfiles: async () => apiClient.profile.getClaudeProfiles(),
    saveClaudeProfile: async (profile: any) => apiClient.profile.saveClaudeProfile(profile),
    deleteClaudeProfile: async (profileId: string) =>
      apiClient.profile.deleteClaudeProfile(profileId),
    renameClaudeProfile: async (profileId: string, name: string) =>
      apiClient.profile.renameClaudeProfile(profileId, name),
    setActiveClaudeProfile: async (profileId: string) =>
      apiClient.profile.setActiveClaudeProfile(profileId),
    switchClaudeProfile: async (profileId: string) =>
      apiClient.profile.switchClaudeProfile(profileId),
    initializeClaudeProfile: async () => ({ success: true }),
    setClaudeProfileToken: async (_profileId: string, _token: string) => ({ success: true }),
    authenticateClaudeProfile: async (_profileId: string) => ({ success: true }),
    verifyClaudeProfileAuth: async (_profileId: string) => ({ success: true, data: true }),
    getClaudeAutoSwitchSettings: async () => apiClient.profile.getAutoSwitchSettings(),
    updateClaudeAutoSwitchSettings: async (settings: any) =>
      apiClient.profile.updateAutoSwitchSettings(settings),
    fetchClaudeUsage: async () => apiClient.profile.getUsage(),
    getAllProfilesUsage: async () => apiClient.profile.getAllProfilesUsage(),
    getBestClaudeProfile: async () => apiClient.profile.getBestProfile(),

    // Account Priority
    getAccountPriority: async () => apiClient.profile.getAccountPriority(),
    setAccountPriority: async (priority: string[]) =>
      apiClient.profile.setAccountPriority(priority),

    // Claude SDK Events
    onClaudeSdkRateLimit: () => () => {},
    onClaudeAuthFailure: () => () => {},
    retryWithProfile: async (_data: any) => ({ success: true }),
    onUsageUpdated: () => () => {},
    requestUsage: async () => ({ success: true, data: null }),
    requestAllProfilesUsage: async () => ({ success: true, data: null }),
    onAllProfilesUsageUpdated: () => () => {},
    onProactiveSwapNotification: () => () => {},

    // ============================================
    // Settings
    // ============================================
    getSettings: async () => apiClient.settings.get(),
    saveSettings: async (settings: any) => apiClient.settings.save(settings),
    updateSettings: async (settings: any) => apiClient.settings.update(settings),
    getCliToolsInfo: async () => apiClient.settings.getCliToolsInfo(),
    getClaudeCodeOnboardingStatus: async () =>
      apiClient.settings.getClaudeCodeOnboardingStatus(),

    // ============================================
    // API Profiles (custom endpoints)
    // ============================================
    getAPIProfiles: async () => apiClient.profile.getAPIProfiles(),
    saveAPIProfile: async (profile: any) => apiClient.profile.saveAPIProfile(profile),
    updateAPIProfile: async (profileId: string, updates: any) =>
      apiClient.profile.updateAPIProfile(profileId, updates),
    deleteAPIProfile: async (profileId: string) => apiClient.profile.deleteAPIProfile(profileId),
    setActiveAPIProfile: async (profileId: string | null) =>
      apiClient.profile.setActiveAPIProfile(profileId),
    testConnection: async (baseUrl: string, apiKey: string, signal?: AbortSignal) =>
      apiClient.profile.testConnection(baseUrl, apiKey),
    testConnectionCancel: async () => ({ success: true }),
    discoverModels: async (baseUrl: string, apiKey: string, signal?: AbortSignal) =>
      apiClient.profile.discoverModels(baseUrl, apiKey),
    discoverModelsCancel: async () => ({ success: true }),

    // ============================================
    // Dialog Operations
    // ============================================
    selectDirectory: async () => {
      const path = await selectDirectory();
      if (path) {
        return { success: true, data: path };
      }
      return { success: false, error: 'No directory selected' };
    },
    createProjectFolder: async (_parentPath: string, _folderName: string) => ({
      success: true,
      data: { path: '' },
    }),
    getDefaultProjectLocation: async () => ({
      success: true,
      data: '',
    }),

    // ============================================
    // App Info
    // ============================================
    getAppVersion: async () => ({ success: true, data: '2.7.6-web' }),

    // ============================================
    // Shell Operations
    // ============================================
    openExternal: async (url: string) => {
      window.open(url, '_blank', 'noopener,noreferrer');
      return { success: true };
    },
    openTerminal: async (_path: string) => ({ success: true }),

    // ============================================
    // Roadmap Operations
    // ============================================
    getRoadmap: async (projectId: string) => apiClient.roadmap.get(projectId),
    getRoadmapStatus: async (projectId: string) => apiClient.roadmap.getStatus(projectId),
    saveRoadmap: async (projectId: string, roadmap: any) =>
      apiClient.roadmap.save(projectId, roadmap),
    generateRoadmap: (projectId: string, enableCompetitorAnalysis?: boolean) => {
      apiClient.roadmap.generate(projectId, enableCompetitorAnalysis);
    },
    refreshRoadmap: (projectId: string) => {
      apiClient.roadmap.refresh(projectId);
    },
    stopRoadmap: async (projectId: string) => apiClient.roadmap.stop(projectId),
    updateFeatureStatus: async (projectId: string, featureId: string, updates: any) =>
      apiClient.roadmap.updateFeature(projectId, featureId, updates),
    convertFeatureToSpec: async (projectId: string, featureId: string) =>
      apiClient.roadmap.convertToSpec(projectId, featureId),
    saveCompetitorAnalysis: async (projectId: string, analysis: any) =>
      apiClient.roadmap.saveCompetitorAnalysis(projectId, analysis),
    saveRoadmapProgress: async (projectId: string, progress: any) =>
      apiClient.roadmap.save(projectId, progress),
    loadRoadmapProgress: async (projectId: string) => apiClient.roadmap.get(projectId),
    clearRoadmapProgress: async (projectId: string) => apiClient.roadmap.save(projectId, null),
    onRoadmapProgress: () => () => {},
    onRoadmapComplete: () => () => {},
    onRoadmapError: () => () => {},
    onRoadmapStopped: () => () => {},

    // ============================================
    // Context Operations
    // ============================================
    getContext: async (projectId?: string) => apiClient.context.get(projectId),
    refreshContextIndex: async (projectId: string) => apiClient.context.refreshIndex(projectId),
    getMemoryStatus: async () => apiClient.context.getMemoryStatus(),
    searchMemories: async (query: string, limit?: number) =>
      apiClient.context.searchMemories(query, limit),
    getMemories: async (projectId?: string) => apiClient.context.getMemories(projectId),

    // ============================================
    // Environment Configuration
    // ============================================
    getEnv: async () => ({ success: true, data: {} }),
    updateEnv: async (_config: any) => ({ success: true }),
    checkClaudeAuth: async () => ({ success: true, data: { authenticated: false } }),
    invokeClaudeSetup: async () => ({ success: true }),

    // ============================================
    // Ideation Operations
    // ============================================
    getIdeation: async (projectId: string) => apiClient.insights.listSessions(projectId),
    generateIdeation: () => {},
    refreshIdeation: () => {},
    stopIdeation: async () => ({ success: true }),
    updateIdea: async (_projectId: string, _ideaId: string, _updates: any) => ({ success: true }),
    convertIdeaToTask: async (_projectId: string, _ideaId: string) => ({ success: true }),
    dismissIdea: async (_projectId: string, _ideaId: string) => ({ success: true }),
    dismissAllIdeas: async (_projectId: string) => ({ success: true }),
    archiveIdea: async (_projectId: string, _ideaId: string) => ({ success: true }),
    deleteIdea: async (_projectId: string, _ideaId: string) => ({ success: true }),
    deleteMultipleIdeas: async (_projectId: string, _ideaIds: string[]) => ({ success: true }),
    onIdeationProgress: () => () => {},
    onIdeationLog: () => () => {},
    onIdeationComplete: () => () => {},
    onIdeationError: () => () => {},
    onIdeationStopped: () => () => {},
    onIdeationTypeComplete: () => () => {},
    onIdeationTypeFailed: () => () => {},

    // ============================================
    // Insights Operations
    // ============================================
    listInsightsSessions: async (projectId?: string) =>
      apiClient.insights.listSessions(projectId),
    getInsightsSession: async (sessionId: string) => apiClient.insights.getSession(sessionId),
    newInsightsSession: async (projectId: string, title?: string) =>
      apiClient.insights.createSession(projectId, title),
    switchInsightsSession: async (sessionId: string) =>
      apiClient.insights.switchSession(sessionId),
    clearInsightsSession: async (sessionId: string) =>
      apiClient.insights.clearSession(sessionId),
    deleteInsightsSession: async (sessionId: string) =>
      apiClient.insights.deleteSession(sessionId),
    deleteInsightsSessions: async (sessionIds: string[]) =>
      apiClient.insights.deleteSessions(sessionIds),
    archiveInsightsSession: async (sessionId: string) =>
      apiClient.insights.archiveSession(sessionId),
    archiveInsightsSessions: async (sessionIds: string[]) =>
      apiClient.insights.archiveSessions(sessionIds),
    unarchiveInsightsSession: async (sessionId: string) =>
      apiClient.insights.unarchiveSession(sessionId),
    renameInsightsSession: async (sessionId: string, title: string) =>
      apiClient.insights.renameSession(sessionId, title),
    updateInsightsModelConfig: async (sessionId: string, config: any) =>
      apiClient.insights.updateModelConfig(sessionId, config),
    sendInsightsMessage: async (sessionId: string, content: string) =>
      apiClient.insights.sendMessage(sessionId, content),
    createTaskFromInsights: async (sessionId: string, messageId: string) =>
      apiClient.insights.createTask(sessionId, messageId),
    onInsightsStreamChunk: () => () => {},
    onInsightsStatus: () => () => {},
    onInsightsError: () => () => {},
    onInsightsSessionUpdated: () => () => {},

    // ============================================
    // File Explorer Operations
    // ============================================
    listFileExplorer: async (_path: string) => ({ success: true, data: [] }),
    readFileExplorer: async (_path: string) => ({ success: true, data: '' }),

    // ============================================
    // GitHub Operations
    // ============================================
    github: {
      getGitHubRepositories: async () => apiClient.github.getRepositories(),
      getGitHubIssues: async (projectId: string, options?: any) =>
        apiClient.github.getIssues(projectId, options),
      getGitHubIssue: async (projectId: string, issueNumber: number) =>
        apiClient.github.getIssue(projectId, issueNumber),
      getIssueComments: async (projectId: string, issueNumber: number) =>
        apiClient.github.getIssueComments(projectId, issueNumber),
      checkGitHubConnection: async (projectId: string) =>
        apiClient.github.checkConnection(projectId),
      investigateGitHubIssue: () => {},
      importGitHubIssues: async (projectId: string, issueNumbers: number[]) =>
        apiClient.github.importIssues(projectId, issueNumbers),
      createGitHubRelease: async (projectId: string, options: any) =>
        apiClient.github.createRelease(projectId, options),
      suggestReleaseVersion: async (projectId: string) =>
        apiClient.github.suggestVersion(projectId),
      checkGitHubCli: async () => apiClient.github.checkCli(),
      checkGitHubAuth: async () => apiClient.github.checkAuth(),
      startGitHubAuth: async () => apiClient.github.startAuth(),
      getGitHubToken: async () => apiClient.github.checkAuth(),
      getGitHubUser: async () => apiClient.github.getUser(),
      listGitHubUserRepos: async () => apiClient.github.listUserRepos(),
      detectGitHubRepo: async (projectId: string) => apiClient.github.checkConnection(projectId),
      getGitHubBranches: async (projectId: string) => apiClient.github.getBranches(projectId),
      createGitHubRepo: async (_name: string, _private?: boolean) =>
        apiClient.github.createRelease('', {}),
      addGitRemote: async (_projectId: string, _remoteUrl: string) => ({ success: true }),
      listGitHubOrgs: async () => ({ success: true, data: { orgs: [] } }),
      onGitHubAuthDeviceCode: () => () => {},
      onGitHubAuthChanged: () => () => {},
      onGitHubInvestigationProgress: () => () => {},
      onGitHubInvestigationComplete: () => () => {},
      onGitHubInvestigationError: () => () => {},
      getAutoFixConfig: async () => null,
      saveAutoFixConfig: async () => true,
      getAutoFixQueue: async () => [],
      checkAutoFixLabels: async () => [],
      checkNewIssues: async () => [],
      startAutoFix: () => {},
      onAutoFixProgress: () => () => {},
      onAutoFixComplete: () => () => {},
      onAutoFixError: () => () => {},
      listPRs: async (projectId: string, options?: any) =>
        apiClient.github.listPRs(projectId, options),
      listMorePRs: async (projectId: string, cursor?: string) =>
        apiClient.github.listPRs(projectId, { cursor }),
      getPR: async (projectId: string, prNumber: number) =>
        apiClient.github.getPR(projectId, prNumber),
      getPRDiff: async (projectId: string, prNumber: number) =>
        apiClient.github.getPRDiff(projectId, prNumber),
      runPRReview: () => {},
      cancelPRReview: async () => true,
      postPRReview: async () => true,
      postPRComment: async () => true,
      mergePR: async () => true,
      assignPR: async () => true,
      markReviewPosted: async () => true,
      getPRReview: async () => null,
      getPRReviewsBatch: async () => ({}),
      notifyExternalReviewComplete: async () => {},
      deletePRReview: async () => true,
      checkNewCommits: async () => ({ hasNewCommits: false, newCommitCount: 0 }),
      checkMergeReadiness: async () => ({
        isDraft: false,
        mergeable: 'UNKNOWN' as const,
        isBehind: false,
        ciStatus: 'none' as const,
        blockers: [],
      }),
      updatePRBranch: async () => ({ success: true }),
      runFollowupReview: () => {},
      getPRLogs: async () => null,
      getWorkflowsAwaitingApproval: async () => ({
        awaiting_approval: 0,
        workflow_runs: [],
        can_approve: false,
      }),
      approveWorkflow: async () => true,
      onPRReviewProgress: () => () => {},
      onPRReviewComplete: () => () => {},
      onPRReviewError: () => () => {},
      onPRReviewStateChange: () => () => {},
      onPRLogsUpdated: () => () => {},
      batchAutoFix: () => {},
      getBatches: async () => [],
      onBatchProgress: () => () => {},
      onBatchComplete: () => () => {},
      onBatchError: () => () => {},
      analyzeIssuesPreview: () => {},
      approveBatches: async () => ({ success: true, batches: [] }),
      onAnalyzePreviewProgress: () => () => {},
      onAnalyzePreviewComplete: () => () => {},
      onAnalyzePreviewError: () => () => {},
      startStatusPolling: async () => true,
      stopStatusPolling: async () => true,
      getPollingMetadata: async () => null,
      onPRStatusUpdate: () => () => {},
    } as any,

    // ============================================
    // Queue Routing
    // ============================================
    queue: {
      getRunningTasksByProfile: async () => ({ success: true, data: { byProfile: {}, totalRunning: 0 } }),
      getBestProfileForTask: async () => ({ success: true, data: null }),
      getBestUnifiedAccount: async () => ({ success: true, data: null }),
      assignProfileToTask: async () => ({ success: true }),
      updateTaskSession: async () => ({ success: true }),
      getTaskSession: async () => ({ success: true, data: null }),
      onQueueProfileSwapped: () => () => {},
      onQueueSessionCaptured: () => () => {},
      onQueueBlockedNoProfiles: () => () => {},
    } as any,

    // ============================================
    // GitLab Operations
    // ============================================
    getGitLabProjects: async () => apiClient.gitlab.getProjects(),
    getGitLabIssues: async (projectId: string, options?: any) =>
      apiClient.gitlab.getIssues(projectId, options),
    getGitLabIssue: async (projectId: string, issueIid: number) =>
      apiClient.gitlab.getIssue(projectId, issueIid),
    getGitLabIssueNotes: async (projectId: string, issueIid: number) =>
      apiClient.gitlab.getIssues(projectId, { issueIid }),
    checkGitLabConnection: async (projectId?: string) =>
      apiClient.gitlab.checkConnection(projectId),
    investigateGitLabIssue: () => {},
    importGitLabIssues: async (projectId: string, issueIids: number[]) =>
      apiClient.gitlab.importIssues(projectId, issueIids),
    createGitLabRelease: async (projectId: string, options: any) =>
      apiClient.gitlab.createRelease(projectId, options),
    getGitLabMergeRequests: async (projectId: string, options?: any) =>
      apiClient.gitlab.listMRs(projectId, options),
    getGitLabMergeRequest: async (projectId: string, mrIid: number) =>
      apiClient.gitlab.getMR(projectId, mrIid),
    createGitLabMergeRequest: async (projectId: string, options: any) =>
      apiClient.gitlab.createMR(projectId, options),
    updateGitLabMergeRequest: async (projectId: string, mrIid: number, updates: any) =>
      apiClient.gitlab.updateMR(projectId, mrIid, updates),
    checkGitLabCli: async () => apiClient.gitlab.checkCli(),
    installGitLabCli: async () => apiClient.gitlab.installCli(),
    checkGitLabAuth: async () => apiClient.gitlab.checkAuth(),
    startGitLabAuth: async () => apiClient.gitlab.startAuth(),
    getGitLabToken: async () => apiClient.gitlab.checkAuth(),
    getGitLabUser: async () => apiClient.gitlab.getUser(),
    listGitLabUserProjects: async () => apiClient.gitlab.getProjects(),
    detectGitLabProject: async (projectId: string) => apiClient.gitlab.checkConnection(projectId),
    getGitLabBranches: async (projectId: string) => apiClient.gitlab.getBranches(projectId),
    createGitLabProject: async (name: string, _private?: boolean) =>
      apiClient.gitlab.createProject(name),
    addGitLabRemote: async (_projectId: string, _remoteUrl: string) => ({ success: true }),
    listGitLabGroups: async () => apiClient.gitlab.listGroups(),
    getGitLabMRDiff: async (projectId: string, mrIid: number) =>
      apiClient.gitlab.getMR(projectId, mrIid),
    runGitLabMRReview: () => {},
    cancelGitLabMRReview: async () => true,
    getGitLabMRReview: async () => null,
    runGitLabFollowupReview: () => {},
    postGitLabMRReview: async () => true,
    postGitLabMRNote: async () => true,
    mergeGitLabMR: async () => true,
    assignGitLabMR: async () => true,
    approveGitLabMR: async () => true,
    checkGitLabMRNewCommits: async () => ({ hasNewCommits: false, newCommitCount: 0 }),
    onGitLabMRReviewProgress: () => () => {},
    onGitLabMRReviewComplete: () => () => {},
    onGitLabMRReviewError: () => () => {},
    onGitLabInvestigationProgress: () => () => {},
    onGitLabInvestigationComplete: () => () => {},
    onGitLabInvestigationError: () => () => {},

    // GitLab Auto-Fix
    getGitLabAutoFixConfig: async () => null,
    saveGitLabAutoFixConfig: async () => true,
    getGitLabAutoFixQueue: async () => [],
    checkGitLabAutoFixLabels: async () => [],
    checkGitLabNewIssues: async () => [],
    startGitLabAutoFix: () => {},
    stopGitLabAutoFix: async () => true,
    onGitLabAutoFixProgress: () => () => {},
    onGitLabAutoFixComplete: () => () => {},
    onGitLabAutoFixError: () => () => {},
    gitLabBatchAutoFix: () => {},
    getGitLabBatches: async () => [],
    onGitLabBatchProgress: () => () => {},
    onGitLabBatchComplete: () => () => {},
    onGitLabBatchError: () => () => {},
    analyzeGitLabIssuesPreview: () => {},
    approveGitLabBatches: async () => ({ success: true, batches: [] }),
    onGitLabAnalyzePreviewProgress: () => () => {},
    onGitLabAnalyzePreviewComplete: () => () => {},
    onGitLabAnalyzePreviewError: () => () => {},

    // GitLab Issue Triage
    runGitLabTriage: () => {},
    getGitLabTriageResults: async () => null,
    applyGitLabTriageLabels: async () => true,
    getGitLabTriageConfig: async () => null,
    saveGitLabTriageConfig: async () => true,
    onGitLabTriageProgress: () => () => {},
    onGitLabTriageComplete: () => () => {},
    onGitLabTriageError: () => () => {},

    // ============================================
    // Linear Integration
    // ============================================
    getLinearTeams: async () => ({ success: true, data: [] }),
    getLinearProjects: async () => ({ success: true, data: [] }),
    getLinearIssues: async () => ({ success: true, data: [] }),
    importLinearIssues: async () => ({ success: true, data: { imported: 0, failed: 0 } }),
    checkLinearConnection: async () => ({ success: true, data: { connected: false } }),

    // ============================================
    // Memory Infrastructure
    // ============================================
    listMemoryDatabases: async () => ({ success: true, data: [] }),
    testMemoryConnection: async () => ({ success: true, data: { success: false } }),

    // Graphiti Validation
    validateGraphitiLlm: async () => ({ success: true, data: { valid: false } }),
    testGraphitiConnection: async () => ({ success: true, data: { success: false } }),

    // Ollama
    checkOllamaStatus: async () => ({ success: true, data: { running: false } }),
    checkOllamaInstalled: async () => ({ success: true, data: { installed: false } }),
    installOllama: async () => ({ success: true }),
    listOllamaModels: async () => ({ success: true, data: { models: [] } }),
    listOllamaEmbeddingModels: async () => ({ success: true, data: { models: [] } }),
    pullOllamaModel: async () => {},
    onOllamaPullProgress: () => () => {},

    // Auto Build Source Env
    getAutoBuildSourceEnv: async () => ({ success: true, data: {} }),
    updateAutoBuildSourceEnv: async () => ({ success: true }),
    checkAutoBuildSourceToken: async () => ({ success: true, data: { valid: false } }),

    // ============================================
    // Changelog Operations
    // ============================================
    getDoneTasks: async (projectId: string) => apiClient.task.list(projectId),
    loadTaskSpecs: async () => ({ success: true, data: [] }),
    generateChangelog: async () => {},
    saveChangelog: async () => ({ success: true }),
    readExistingChangelog: async () => ({ success: true, data: null }),
    suggestVersion: async () => ({ success: true, data: { suggested: '1.0.0' } }),
    suggestVersionFromCommits: async () => ({ success: true, data: { suggested: '1.0.0' } }),
    getTags: async () => ({ success: true, data: [] }),
    getCommitsPreview: async () => ({ success: true, data: [] }),
    saveChangelogImage: async () => ({ success: true, data: '' }),
    readLocalChangelogImage: async () => ({ success: true, data: null }),
    onChangelogGenerationProgress: () => () => {},
    onChangelogGenerationComplete: () => () => {},
    onChangelogGenerationError: () => () => {},

    // ============================================
    // Claude Code Operations
    // ============================================
    checkClaudeCodeVersion: async () => ({
      success: true,
      data: {
        installed: '1.0.0',
        latest: '1.0.0',
        isOutdated: false,
        path: '/usr/local/bin/claude',
        detectionResult: {
          found: true,
          version: '1.0.0',
          path: '/usr/local/bin/claude',
          source: 'system-path' as const,
          message: 'Claude Code CLI found',
        },
      },
    }),
    installClaudeCode: async () => ({
      success: true,
      data: { command: 'npm install -g @anthropic-ai/claude-code' },
    }),
    getClaudeCodeVersions: async () => ({
      success: true,
      data: { versions: ['1.0.0'] },
    }),
    installClaudeCodeVersion: async (version: string) => ({
      success: true,
      data: { command: `npm install -g @anthropic-ai/claude-code@${version}`, version },
    }),
    getClaudeCodeInstallations: async () => ({
      success: true,
      data: {
        installations: [
          {
            path: '/usr/local/bin/claude',
            version: '1.0.0',
            source: 'system-path' as const,
            isActive: true,
          },
        ],
        activePath: '/usr/local/bin/claude',
      },
    }),
    setClaudeCodeActivePath: async (cliPath: string) => ({
      success: true,
      data: { path: cliPath },
    }),

    // ============================================
    // MCP Server Operations
    // ============================================
    checkMcpHealth: async (server: any) => ({
      success: true,
      data: {
        serverId: server.id,
        status: 'unknown' as const,
        message: 'Health check not available in web mode',
        checkedAt: new Date().toISOString(),
      },
    }),
    testMcpConnection: async (server: any) => ({
      success: true,
      data: {
        serverId: server.id,
        success: false,
        message: 'Connection test not available in web mode',
      },
    }),

    // ============================================
    // Sentry Operations
    // ============================================
    onSentryStateChanged: async () => {},
    getSentryDsn: async () => ({ success: true, data: '' }),
    getSentryConfig: async () => ({
      success: true,
      data: { dsn: '', tracesSampleRate: 0.1, profilesSampleRate: 0.1 },
    }),

    // ============================================
    // Spell Check
    // ============================================
    setSpellCheckLanguages: async (_languages: string[]) => ({ success: true }),

    // ============================================
    // Screenshot Operations
    // ============================================
    getSources: async () => ({ success: true, data: [] }),
    capture: async (_options: { sourceId: string }) => ({
      success: false,
      error: 'Screenshot capture not available in web mode',
    }),

    // ============================================
    // Debug Operations
    // ============================================
    getDebugInfo: async () => ({
      systemInfo: {
        appVersion: '2.7.6-web',
        platform: 'web',
        isPackaged: 'false',
      },
      recentErrors: [],
      logsPath: '/mock/logs',
      debugReport: '[Web] Debug report not available in web mode',
    }),
    openLogsFolder: async () => ({ success: false, error: 'Not available in web mode' }),
    copyDebugInfo: async () => ({ success: false, error: 'Not available in web mode' }),
    getRecentErrors: async () => [],
    listLogFiles: async () => [],
    simulateRateLimit: async () => ({ success: true }),

    // ============================================
    // App Update Operations
    // ============================================
    checkForUpdate: async () => ({ success: true, data: null }),
    downloadUpdate: async () => {},
    downloadStableUpdate: async () => {},
    installUpdate: async () => {},
    getUpdateVersion: async () => ({ success: true, data: null }),
    getDownloadedUpdate: async () => ({ success: true, data: null }),
    onUpdateAvailable: () => () => {},
    onUpdateDownloaded: () => () => {},
    onUpdateProgress: () => () => {},
    onUpdateError: () => () => {},
    onStableDowngradeAvailable: () => () => {},
    onReadOnlyVolume: () => () => {},

    // ============================================
    // Release Operations
    // ============================================
    suggestReleaseVersion: async () => ({
      success: true,
      data: { suggested: '1.0.0', current: '0.0.0', bumpType: 'minor' as const },
    }),
    createRelease: async () => ({ success: true }),
    runReleasePreflight: async () => ({ success: true, data: { checks: [], ready: true } }),
    getReleaseVersions: async () => ({ success: true, data: [] }),
    onReleaseProgress: () => () => {},

    // ============================================
    // Worktree Change Detection
    // ============================================
    checkWorktreeChanges: async () => ({
      success: true,
      data: { hasChanges: false, changedFileCount: 0 },
    }),

  } as ElectronAPI;
}

/**
 * Initialize the web API
 */
export function initWebAPI(): void {
  if (!isElectron) {
    console.log(
      '%c[Web API] Initializing HTTP/WebSocket API client',
      'color: #4ade80; font-weight: bold;'
    );
    (window as any).electronAPI = createWebAPI();
  }
}

// Auto-initialize
initWebAPI();
