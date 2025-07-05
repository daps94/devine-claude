import type { McpTool } from '../protocol';
import type { McpToolHandler } from '../server';
import type { InstanceConfig } from '../../types';

export interface TaskToolOptions {
  instanceName: string;
  instanceConfig: InstanceConfig;
  executor: any; // Will be ClaudeExecutor or OpenAIExecutor
}

export class TaskTool implements McpToolHandler {
  private instanceName: string;
  private instanceConfig: InstanceConfig;
  private executor: any;

  constructor(options: TaskToolOptions) {
    this.instanceName = options.instanceName;
    this.instanceConfig = options.instanceConfig;
    this.executor = options.executor;
  }

  getDefinition(): McpTool {
    const description = `Execute a task using Agent ${this.instanceName}. ${this.instanceConfig.description}`;

    return {
      name: 'task',
      description,
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'The task or question for the agent',
          },
          system_prompt: {
            type: 'string',
            description: 'Override the system prompt for this request',
          },
          new_session: {
            type: 'boolean',
            description: 'Start a new session (default: false)',
          },
        },
        required: ['prompt'],
      },
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const { prompt, system_prompt, new_session } = args;

    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Missing or invalid prompt parameter');
    }

    try {
      // Reset session if requested
      if (new_session) {
        await this.executor.resetSession();
      }

      // Execute the task
      const result = await this.executor.execute({
        prompt,
        systemPrompt: system_prompt,
      });

      return {
        success: true,
        result,
        instance: this.instanceName,
        sessionId: this.executor.getSessionId(),
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
