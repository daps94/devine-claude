import { spawn, ChildProcess } from 'child_process';
import split2 from 'split2';
import { Logger } from '../utils/logger';
import { commandExists } from '../utils/system';
import { BaseExecutor, ExecutorOptions, ExecutorStats } from './base';
import { SecureContextManager } from '../core/secureContextManager';
import type { InstanceConfig, Model } from '../types';

export interface ClaudeExecutorOptions {
  instanceName: string;
  instanceConfig: InstanceConfig;
  directory: string;
  additionalDirectories?: string[];
  mcpConfigPath?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  sessionId?: string;
  logger?: Logger;
  vibe?: boolean;
}

interface ClaudeEvent {
  id?: string;
  type?: string;
  event?: string;
  data?: any;
  error?: string;
  cost?: number;
}

export class ClaudeExecutor extends BaseExecutor {
  private instanceName: string;
  private instanceConfig: InstanceConfig;
  private directory: string;
  private additionalDirectories: string[];
  private mcpConfigPath?: string;
  private allowedTools: string[];
  private disallowedTools: string[];
  private logger?: Logger;
  private vibe: boolean;
  private isResetting = false;

  constructor(options: ClaudeExecutorOptions) {
    super();

    if (!commandExists('claude')) {
      throw new Error(
        'Claude CLI not found. Please install it first: npm install -g @anthropic-ai/claude-code',
      );
    }

    this.instanceName = options.instanceName;
    this.instanceConfig = options.instanceConfig;
    this.directory = options.directory;
    this.additionalDirectories = options.additionalDirectories || [];
    this.mcpConfigPath = options.mcpConfigPath;
    this.allowedTools = options.allowedTools || [];
    this.disallowedTools = options.disallowedTools || [];
    this.sessionId = options.sessionId;
    this.logger = options.logger;
    this.vibe = options.vibe || false;
  }

  async execute(options: ExecutorOptions): Promise<string> {
    const args = await this.buildClaudeArgs(options);

    return new Promise((resolve, reject) => {
      const claude = spawn('claude', args, {
        cwd: this.directory,
        env: {
          ...process.env,
          // Ensure MCP config is loaded
          ...(this.mcpConfigPath ? { CLAUDE_MCP_CONFIG: this.mcpConfigPath } : {}),
        },
      });

      let response = '';
      let hasError = false;
      let sessionCaptured = false;

      // Parse JSON streaming output
      const parser = claude.stdout.pipe(split2());

      parser.on('data', (line: string) => {
        if (!line.trim()) return;

        try {
          const event = JSON.parse(line) as ClaudeEvent;

          // Log the event
          if (this.logger) {
            this.logger.logResponse(this.instanceName, event);
          }

          // Capture session ID
          if (!sessionCaptured && event.id) {
            this.sessionId = event.id;
            sessionCaptured = true;
          }

          // Handle different event types
          if (event.type === 'text') {
            response += event.data || '';
          } else if (event.type === 'error' || event.error) {
            hasError = true;
            response = event.error || 'Unknown error';
          }

          // Update cost tracking
          if (event.cost) {
            this.stats.totalCost += event.cost;
          }
        } catch (error) {
          // Not JSON, might be plain text
          response += line;
        }
      });

      claude.stderr.on('data', (data: Buffer) => {
        const error = data.toString();
        if (this.logger) {
          this.logger.logError(this.instanceName, error);
        }
        hasError = true;
        response = error;
      });

      claude.on('close', (code) => {
        this.stats.totalCalls++;

        if (code !== 0 || hasError) {
          reject(new Error(response || `Claude process exited with code ${code}`));
        } else {
          resolve(response);
        }
      });

      claude.on('error', (error) => {
        if (this.logger) {
          this.logger.logError(this.instanceName, error);
        }
        reject(error);
      });
    });
  }

  private async buildClaudeArgs(options: ExecutorOptions): Promise<string[]> {
    const args: string[] = [];

    // Add model
    if (this.instanceConfig.model) {
      args.push('--model', this.mapModel(this.instanceConfig.model));
    }

    // Add directories
    this.additionalDirectories.forEach((dir) => {
      args.push('--add-dir', dir);
    });

    // Add MCP config
    if (this.mcpConfigPath) {
      args.push('--mcp-config', this.mcpConfigPath);
    }

    // Add session ID
    if (this.sessionId && !this.isResetting) {
      args.push('--resume', this.sessionId);
    }

    // Add tool permissions
    if (this.vibe || this.instanceConfig.vibe) {
      args.push('--dangerously-skip-permissions');
    } else {
      if (this.allowedTools.length > 0) {
        args.push('--allowedTools', this.allowedTools.join(','));
      }
      if (this.disallowedTools.length > 0) {
        args.push('--disallowedTools', this.disallowedTools.join(','));
      }
    }

    // Add system prompt with context injection
    let systemPrompt = options.systemPrompt || this.instanceConfig.prompt || '';

    // Inject context from secure context manager
    try {
      const contextManager = new SecureContextManager(this.directory);
      const agentContext = await contextManager.getContext(this.instanceName);

      if (agentContext && Object.keys(agentContext.data).length > 0) {
        const contextSection = `
## Persistent Context

The following context is available from previous sessions:

\`\`\`json
${JSON.stringify(agentContext.data, null, 2)}
\`\`\`

Consider this context when performing your tasks.
`;
        systemPrompt = systemPrompt ? `${systemPrompt}\n\n${contextSection}` : contextSection;
      }
    } catch (error) {
      // Log error but don't fail - context is optional enhancement
      if (this.logger) {
        this.logger.logError(this.instanceName, `Failed to load context: ${error}`);
      }
    }

    if (systemPrompt) {
      args.push('--append-system-prompt', systemPrompt);
    }

    // Add the actual prompt
    args.push('-p', options.prompt);

    return args;
  }

  private mapModel(model: Model): string {
    // Claude CLI expects model aliases, not full names
    return model;
  }

  async resetSession(): Promise<void> {
    this.isResetting = true;
    this.sessionId = undefined;
    this.isResetting = false;
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  getStats(): ExecutorStats {
    return { ...this.stats };
  }
}
