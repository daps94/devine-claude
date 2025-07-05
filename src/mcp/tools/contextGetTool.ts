import type { McpTool } from '../protocol';
import type { McpToolHandler } from '../server';
import { ContextManager } from '../../core/contextManager';

export interface ContextGetToolOptions {
  instanceName: string;
  swarmName: string;
}

export class ContextGetTool implements McpToolHandler {
  private instanceName: string;
  private contextManager: ContextManager;

  constructor(options: ContextGetToolOptions) {
    this.instanceName = options.instanceName;
    this.contextManager = new ContextManager(options.swarmName);
  }

  getDefinition(): McpTool {
    return {
      name: 'context_get',
      description: 'Retrieve context at different levels (global, swarm, or instance)',
      inputSchema: {
        type: 'object',
        properties: {
          level: {
            type: 'string',
            enum: ['global', 'swarm', 'instance', 'combined'],
            description: 'The context level to retrieve',
          },
          key: {
            type: 'string',
            description:
              'Optional specific key to retrieve. If not provided, returns all context at the level',
          },
          instanceName: {
            type: 'string',
            description:
              'Instance name (required for instance level, defaults to current instance)',
          },
        },
        required: ['level'],
      },
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const { level, key, instanceName = this.instanceName } = args;

    try {
      let context: any;

      switch (level) {
        case 'global':
          context = key
            ? this.contextManager.getGlobalContextKey(key)
            : this.contextManager.getGlobalContext();
          break;

        case 'swarm':
          context = key
            ? this.contextManager.getSwarmContextKey(key)
            : this.contextManager.getSwarmContext();
          break;

        case 'instance':
          context = key
            ? this.contextManager.getInstanceContextKey(instanceName, key)
            : this.contextManager.getInstanceContext(instanceName);
          break;

        case 'combined':
          // Get the full merged context for the instance
          context = this.contextManager.buildInstanceContext(instanceName);
          if (key) {
            context = context[key];
          }
          break;

        default:
          throw new Error(`Invalid context level: ${level}`);
      }

      return {
        success: true,
        level,
        key,
        instanceName: level === 'instance' ? instanceName : undefined,
        context,
        found: context !== undefined && context !== null,
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
