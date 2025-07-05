import type { McpTool } from '../protocol';
import type { McpToolHandler } from '../server';
import { ContextManager } from '../../core/contextManager';

export interface ContextSetToolOptions {
  instanceName: string;
  swarmName: string;
}

export class ContextSetTool implements McpToolHandler {
  private instanceName: string;
  private contextManager: ContextManager;

  constructor(options: ContextSetToolOptions) {
    this.instanceName = options.instanceName;
    this.contextManager = new ContextManager(options.swarmName);
  }

  getDefinition(): McpTool {
    return {
      name: 'context_set',
      description: 'Set a context value at different levels (global, swarm, or instance)',
      inputSchema: {
        type: 'object',
        properties: {
          level: {
            type: 'string',
            enum: ['global', 'swarm', 'instance'],
            description: 'The context level to set',
          },
          key: {
            type: 'string',
            description: 'The key to set',
          },
          value: {
            description: 'The value to set (can be any JSON-serializable type)',
          },
          instanceName: {
            type: 'string',
            description:
              'Instance name (required for instance level, defaults to current instance)',
          },
        },
        required: ['level', 'key', 'value'],
      },
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const { level, key, value, instanceName = this.instanceName } = args;

    if (!key || typeof key !== 'string') {
      return {
        success: false,
        error: 'Invalid key parameter - must be a non-empty string',
      };
    }

    try {
      switch (level) {
        case 'global':
          this.contextManager.setGlobalContext(key, value);
          break;

        case 'swarm':
          this.contextManager.setSwarmContext(key, value);
          break;

        case 'instance':
          this.contextManager.setInstanceContext(instanceName, key, value);
          break;

        default:
          throw new Error(`Invalid context level: ${level}`);
      }

      return {
        success: true,
        level,
        key,
        value,
        instanceName: level === 'instance' ? instanceName : undefined,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        level,
        key,
      };
    }
  }
}
