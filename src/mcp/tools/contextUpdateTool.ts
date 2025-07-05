import type { McpTool } from '../protocol';
import type { McpToolHandler } from '../server';
import { ContextManager } from '../../core/contextManager';

export interface ContextUpdateToolOptions {
  instanceName: string;
  swarmName: string;
}

export class ContextUpdateTool implements McpToolHandler {
  private instanceName: string;
  private contextManager: ContextManager;

  constructor(options: ContextUpdateToolOptions) {
    this.instanceName = options.instanceName;
    this.contextManager = new ContextManager(options.swarmName);
  }

  getDefinition(): McpTool {
    return {
      name: 'context_update',
      description: 'Update multiple context values at once',
      inputSchema: {
        type: 'object',
        properties: {
          level: {
            type: 'string',
            enum: ['global', 'swarm', 'instance'],
            description: 'The context level to update',
          },
          updates: {
            type: 'object',
            description: 'Object containing key-value pairs to update',
          },
          instanceName: {
            type: 'string',
            description:
              'Instance name (required for instance level, defaults to current instance)',
          },
          operation: {
            type: 'string',
            enum: ['merge', 'replace'],
            description: 'How to apply updates: merge with existing or replace entirely',
            default: 'merge',
          },
        },
        required: ['level', 'updates'],
      },
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const { level, updates, instanceName = this.instanceName, operation = 'merge' } = args;

    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return {
        success: false,
        error: 'Invalid updates parameter - must be an object',
      };
    }

    try {
      const updateCount = Object.keys(updates).length;

      switch (level) {
        case 'global':
          this.contextManager.updateGlobalContext(updates, operation);
          break;

        case 'swarm':
          this.contextManager.updateSwarmContext(updates, operation);
          break;

        case 'instance':
          this.contextManager.updateInstanceContext(instanceName, updates, operation);
          break;

        default:
          throw new Error(`Invalid context level: ${level}`);
      }

      return {
        success: true,
        level,
        operation,
        updateCount,
        instanceName: level === 'instance' ? instanceName : undefined,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        level,
      };
    }
  }
}
