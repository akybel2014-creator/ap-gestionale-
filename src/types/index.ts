export type ProjectType =
  | 'website'
  | 'web-app'
  | 'landing-page'
  | 'ecommerce'
  | 'dashboard'
  | 'portfolio'
  | 'blog'
  | 'other';

export type ProjectStatus = 'draft' | 'generating' | 'generated' | 'error';

export type ActivityStatus = 'recorded' | 'generating' | 'generated' | 'exported' | 'error';

export type ActivityType = 'instruction' | 'INSTRUCTION' | 'export' | 'EXPORT' | 'EXPORT_PROJECT';

export type ActivityLogFilter = 'ALL' | 'INSTRUCTION' | 'EXPORT';

export interface Instruction {
  id: string;
  text: string;
  timestamp: string;
  status?: ActivityStatus;
  projectId?: string;
  projectName?: string;
  userId?: string;
}

export interface ActivityLogEntry {
  id: string;
  projectId: string;
  projectName: string;
  userId: string;
  instructionText: string;
  timestamp: string;
  status: ActivityStatus;
  type?: 'EXPORT' | 'EXPORT_PROJECT' | 'INSTRUCTION';
  activityType?: ActivityType;
  codeVersion?: string;
}

export interface ProjectFile {
  path: string;
  content: string;
  language: 'html' | 'typescript' | 'javascript' | 'css' | 'json' | 'markdown';
  description?: string;
  updatedAt: string;
}

export interface ProjectDatabaseField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'timestamp' | 'json';
  required: boolean;
  description?: string;
}

export interface ProjectDatabaseEntity {
  name: string;
  description: string;
  fields: ProjectDatabaseField[];
}

export interface ProjectApiRouteSpec {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  authRequired: boolean;
}

export type AgentRole = 'planner' | 'frontend' | 'backend' | 'qa';

export type AgentStageStatus = 'pending' | 'running' | 'completed' | 'error';

export interface AgentStageResult {
  role: AgentRole;
  status: AgentStageStatus;
  startedAt: string;
  completedAt?: string;
  summary: string;
  artifactsProduced?: string[];
  error?: string;
}

export interface SandboxCheckResult {
  id: string;
  category: 'html-structure' | 'js-syntax' | 'json-schema' | 'security-hygiene';
  target: string;
  passed: boolean;
  message: string;
}

export interface SandboxVerificationReport {
  id: string;
  timestamp: string;
  isolatedMode: 'vm-syntax-and-static-ast';
  passed: boolean;
  attemptNumber: number;
  checks: SandboxCheckResult[];
  durationMs: number;
}

export interface AgentPipelinePlan {
  architectureSummary: string;
  plannedFiles: string[];
  dependencies: Record<string, string>;
  databaseSchema: ProjectDatabaseEntity[];
  apiRoutes: ProjectApiRouteSpec[];
}

export interface AgentPipelineRun {
  id: string;
  projectId: string;
  userId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  healingAttemptsUsed: number;
  maxHealingAttempts: number;
  stages: AgentStageResult[];
  plan?: AgentPipelinePlan;
  sandboxReport?: SandboxVerificationReport;
  error?: string;
}

export interface ProjectVersionSnapshot {
  versionId: string;
  createdAt: string;
  summary: string;
  previewHtml: string | null;
  files?: ProjectFile[];
  dependencies?: Record<string, string>;
  databaseSchema?: ProjectDatabaseEntity[];
  apiRoutes?: ProjectApiRouteSpec[];
  sandboxPassed?: boolean;
}

export type OutputPresentationMode = 'app' | 'site' | 'slides' | 'data';

export interface ProjectChatStageUpdate {
  role: AgentRole;
  status: AgentStageStatus;
  message: string;
  artifactsProduced?: string[];
  timestamp: string;
}

export interface ProjectChatMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  selectedAgents: AgentRole[];
  targetFiles: string[];
  status: 'streaming' | 'completed' | 'error';
  stageUpdates?: ProjectChatStageUpdate[];
  artifactsProduced?: string[];
  error?: string;
}

export interface Project {
  id: string;
  userId?: string;
  name: string;
  description: string;
  type: ProjectType;
  status: ProjectStatus;
  instructions: Instruction[];
  previewHtml: string | null;
  codeVersion?: string;
  /** Extended multi-file project workspace (backward-compatible with single-file previewHtml) */
  files?: ProjectFile[];
  /** NPM/runtime package dependencies map */
  dependencies?: Record<string, string>;
  /** Declarative database entities designed for the application */
  databaseSchema?: ProjectDatabaseEntity[];
  /** Declarative backend API route specifications */
  apiRoutes?: ProjectApiRouteSpec[];
  /** Immutable version history snapshots for rollback and comparison */
  versions?: ProjectVersionSnapshot[];
  /** Latest multi-agent orchestrator execution run */
  lastAgentRun?: AgentPipelineRun;
  /** Persisted multi-agent conversation thread per project */
  chatMessages?: ProjectChatMessage[];
  /** Preferred output presentation mode */
  preferredOutputMode?: OutputPresentationMode;
  createdAt: string;
  updatedAt: string;
}

export type AIProvider = 'managed' | 'gemini' | 'openai' | 'anthropic' | 'groq' | 'custom' | '';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  endpoint: string;
}

export interface GitHubSettings {
  username: string;
  token: string;
}

export type ThemeAccent = 'blue' | 'indigo' | 'violet' | 'emerald';

export interface ThemeSettings {
  accentColor: ThemeAccent;
  sidebarStyle: 'navy' | 'slate';
}

export interface AppSettings {
  ai: AISettings;
  github: GitHubSettings;
  theme?: ThemeSettings;
}

export type ViewType = 'dashboard' | 'editor' | 'settings';

export type AdminSection =
  | 'overview'
  | 'users'
  | 'projects'
  | 'providers'
  | 'credits'
  | 'settings';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}
