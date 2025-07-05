import type { McpTool } from '../protocol';
import type { McpToolHandler } from '../server';

export interface SessionInfoToolOptions {
  instanceName: string;
  instanceId: string;
  directory: string;
  executor: any;
  sessionPath: string;
}

export class SessionInfoTool implements McpToolHandler {
  private instanceName: string;
  private instanceId: string;
  private directory: string;
  private executor: any;
  private sessionPath: string;

  constructor(options: SessionInfoToolOptions) {
    this.instanceName = options.instanceName;
    this.instanceId = options.instanceId;
    this.directory = options.directory;
    this.executor = options.executor;
    this.sessionPath = options.sessionPath;
  }

  getDefinition(): McpTool {
    return {
      name: 'session_info',
      description: 'Get information about the current Claude session for this agent',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };
  }

  async execute(_args: Record<string, any>): Promise<any> {
    try {
      const sessionId = this.executor.getSessionId();
      const stats = await this.executor.getStats();

      return {
        instance: this.instanceName,
        instanceId: this.instanceId,
        sessionId,
        directory: this.directory,
        sessionPath: this.sessionPath,
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        stats,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        instance: this.instanceName,
        instanceId: this.instanceId,
      };
    }
  }
}
