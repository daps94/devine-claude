import type { McpTool } from '../protocol';
import type { McpToolHandler } from '../server';
import { ContextManager } from '../../core/contextManager';

export interface ContextDeleteToolOptions {
  instanceName: string;
  swarmName: string;
}

export class ContextDeleteTool implements McpToolHandler {
  private instanceName: string;
  private contextManager: ContextManager;

  constructor(options: ContextDeleteToolOptions) {
    this.instanceName = options.instanceName;
    this.contextManager = new ContextManager(options.swarmName);
  }

  getDefinition(): McpTool {
    return {
      name: 'context_delete',
      description: 'Delete a context key or clear entire context level',
      inputSchema: {
        type: 'object',
        properties: {
          level: {
            type: 'string',
            enum: ['global', 'swarm', 'instance'],
            description: 'The context level to delete from',
          },
          key: {
            type: 'string',
            description: 'The key to delete. If not provided, clears all context at the level',
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
      let deleted = false;

      switch (level) {
        case 'global':
          if (key) {
            deleted = this.contextManager.deleteGlobalContext(key);
          } else {
            this.contextManager.clearGlobalContext();
            deleted = true;
          }
          break;

        case 'swarm':
          if (key) {
            deleted = this.contextManager.deleteSwarmContext(key);
          } else {
            this.contextManager.clearSwarmContext();
            deleted = true;
          }
          break;

        case 'instance':
          if (key) {
            deleted = this.contextManager.deleteInstanceContext(instanceName, key);
          } else {
            this.contextManager.clearInstanceContext(instanceName);
            deleted = true;
          }
          break;

        default:
          throw new Error(`Invalid context level: ${level}`);
      }

      return {
        success: true,
        level,
        key: key || '[all]',
        deleted,
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
