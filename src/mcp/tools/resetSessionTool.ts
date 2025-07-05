import type { McpTool } from '../protocol';
import type { McpToolHandler } from '../server';

export interface ResetSessionToolOptions {
  instanceName: string;
  executor: any;
}

export class ResetSessionTool implements McpToolHandler {
  private instanceName: string;
  private executor: any;

  constructor(options: ResetSessionToolOptions) {
    this.instanceName = options.instanceName;
    this.executor = options.executor;
  }

  getDefinition(): McpTool {
    return {
      name: 'reset_session',
      description: 'Reset the Claude session for this agent, starting fresh on the next task',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };
  }

  async execute(_args: Record<string, any>): Promise<any> {
    try {
      const oldSessionId = this.executor.getSessionId();
      await this.executor.resetSession();
      const newSessionId = this.executor.getSessionId();

      return {
        success: true,
        instance: this.instanceName,
        oldSessionId,
        newSessionId,
        message: 'Session reset successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        instance: this.instanceName,
      };
    }
  }
}
