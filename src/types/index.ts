// Core types for Claude Swarm

export type Model = 'opus' | 'sonnet' | 'haiku' | 'gpt-4o' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
export type Provider = 'claude' | 'openai';
export type Tool = 'Read' | 'Edit' | 'Write' | 'Bash' | 'WebFetch' | 'WebSearch' | `mcp__${string}`;
export type McpServerType = 'stdio' | 'sse';

export interface SwarmConfig {
  version: number;
  swarm: {
    name: string;
    main: string;
    before?: string[];
    instances: Record<string, InstanceConfig>;
  };
}

export interface InstanceConfig {
  description: string;
  directory?: string | string[];
  model?: Model;
  connections?: string[];
  allowed_tools?: Tool[];
  disallowed_tools?: Tool[];
  tools?: Tool[]; // Backward compatibility
  mcps?: McpServerConfig[];
  prompt?: string;
  vibe?: boolean;
  worktree?: boolean | string;
  provider?: Provider;

  // OpenAI specific fields
  temperature?: number;
  api_version?: 'chat_completion' | 'responses';
  openai_token_env?: string;
  base_url?: string;
}

export interface McpServerConfig {
  name: string;
  type: McpServerType;

  // For stdio type
  command?: string;
  args?: string[];
  env?: Record<string, string>;

  // For sse type
  url?: string;
}

export interface McpConfiguration {
  mcpServers: Record<string, McpServerDefinition>;
}

export interface McpServerDefinition {
  type: McpServerType;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

export interface SessionMetadata {
  swarmName: string;
  mainInstance: string;
  configFile: string;
  startTime: string;
  worktree?: string;
  startDirectory: string;
  instances: Record<string, InstanceSessionData>;
}

export interface InstanceSessionData {
  id: string;
  name: string;
  directory: string;
  model: Model;
  provider: Provider;
  sessionId?: string;
  pid?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  cost?: number;
  calls?: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface McpRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface McpResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: McpError;
}

export interface McpError {
  code: number;
  message: string;
  data?: any;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  command: string;
  startTime: Date;
}

export interface SessionLogEntry {
  timestamp: string;
  instance: string;
  type: 'request' | 'response' | 'error' | 'info';
  data: any;
}

export interface CommandOptions {
  config?: string;
  vibe?: boolean;
  prompt?: string;
  sessionId?: string;
  worktree?: string | boolean;
  force?: boolean;
  model?: Model;
  output?: string;
  limit?: number;
  days?: number;
  interactive?: boolean;
}

export interface OrchestratorOptions {
  config: SwarmConfig;
  configPath: string;
  sessionPath: string;
  vibe: boolean;
  prompt?: string;
  worktree?: string;
  isRestoration: boolean;
  interactive?: boolean;
}
