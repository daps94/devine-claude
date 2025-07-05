import { spawn } from 'child_process';
import { copyFileSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { Configuration } from './configuration';
import { SessionPath } from './sessionPath';
import { showBanner } from '../utils/banner';
import { ProcessTracker } from './processTracker';
import { McpGenerator } from '../mcp/generator';
import { WorktreeManager } from '../utils/worktree';
import { WorkbenchManager } from '../utils/workbench';
import { Logger } from '../utils/logger';
import { executeCommand, commandExists } from '../utils/system';
import { ContextManager } from './contextManager';
import type {
  OrchestratorOptions,
  SessionMetadata,
  InstanceSessionData,
  Model,
  InstanceConfig,
} from '../types';

export class Orchestrator {
  private configHelper: Configuration;
  private sessionPath: SessionPath;
  private processTracker: ProcessTracker;
  private worktreeManager?: WorktreeManager;
  private workbenchManager?: WorkbenchManager;
  private logger: Logger;
  private options: OrchestratorOptions;
  private mcpGenerator?: McpGenerator;
  private startTime: Date;

  constructor(options: OrchestratorOptions) {
    this.options = options;
    this.configHelper = new Configuration(options.config);
    this.sessionPath = new SessionPath();
    this.processTracker = new ProcessTracker();
    this.logger = new Logger(this.sessionPath.getSessionPath());
    this.startTime = new Date();

    // Set up worktree manager if needed
    if (options.worktree) {
      this.worktreeManager = new WorktreeManager(this.sessionPath.getWorktreePath(), this.logger);
    }
  }

  async start(): Promise<void> {
    showBanner();
    const spinner = ora('Initializing Devine orchestration...').start();

    try {
      // Ensure Claude CLI is available
      if (!commandExists('claude')) {
        throw new Error(
          'Claude CLI not found. Please install it first: npm install -g @anthropic-ai/claude-code',
        );
      }

      // Set up signal handlers
      this.processTracker.setupSignalHandlers();
      this.processTracker.addCleanupHandler(() => this.cleanup());

      // Create session directories
      this.sessionPath.ensureDirectories();
      this.sessionPath.saveStartDirectory(process.cwd());
      this.sessionPath.createCurrentSymlink();

      // Copy config to session
      copyFileSync(this.options.configPath, this.sessionPath.getConfigPath());

      // Initialize workbench
      spinner.text = 'Setting up project workbench...';
      const mainDirectory = this.getMainDirectory();
      this.workbenchManager = new WorkbenchManager(mainDirectory, this.sessionPath.getTimestamp());
      await this.workbenchManager.initialize();

      spinner.text = 'Running before commands...';

      // Execute before commands
      await this.executeBeforeCommands();

      spinner.text = 'Generating MCP configurations...';

      // Generate MCP configurations
      // Use the original config instead of the copied one to preserve relative path resolution
      this.mcpGenerator = await McpGenerator.generateFromConfig(
        this.options.configPath,
        this.sessionPath,
        this.options.isRestoration ? this.sessionPath.loadMetadata() || undefined : undefined,
      );

      // Create initial metadata
      const metadata = this.createMetadata();
      this.sessionPath.saveMetadata(metadata);

      spinner.text = 'Launching main instance...';

      // Launch main instance
      await this.launchMainInstance();

      spinner.succeed('Devine orchestration initialized successfully!');

      console.log(chalk.cyan('\nSession Information:'));
      console.log(chalk.gray('Session Path:'), this.sessionPath.getSessionPath());
      console.log(chalk.gray('Main Instance:'), this.options.config.swarm.main);
      console.log(chalk.gray('Model:'), this.getMainModel());
      console.log(chalk.gray('Directory:'), this.getMainDirectory());

      if (this.options.prompt) {
        console.log(chalk.gray('Initial Prompt:'), this.options.prompt);
      }

      console.log(chalk.yellow('\nPress Ctrl+C to exit\n'));
    } catch (error) {
      spinner.fail('Failed to initialize Claude Swarm');
      throw error;
    }
  }

  private async executeBeforeCommands(): Promise<void> {
    const beforeCommands = this.options.config.swarm.before;
    if (!beforeCommands || beforeCommands.length === 0) return;

    for (const command of beforeCommands) {
      this.logger.info('system', `Executing: ${command}`);

      try {
        const output = executeCommand(command, {
          cwd: process.cwd(),
        });

        if (output) {
          this.logger.info('system', `Output: ${output}`);
        }
      } catch (error) {
        this.logger.error(`Command failed: ${command}`, { error });
        throw new Error(`Before command failed: ${command}`);
      }
    }
  }

  private createMetadata(): SessionMetadata {
    const instances: Record<string, InstanceSessionData> = {};

    // Create instance data for all instances
    Object.entries(this.options.config.swarm.instances).forEach(([name, config]) => {
      const instanceId = this.mcpGenerator?.getInstanceId(name);
      if (!instanceId) return;

      instances[name] = {
        id: instanceId,
        name,
        directory: this.configHelper.getInstanceDirectory(config),
        model: config.model || 'opus',
        provider: config.provider || 'claude',
        status: 'pending',
      };
    });

    return {
      swarmName: this.options.config.swarm.name,
      mainInstance: this.options.config.swarm.main,
      configFile: this.options.configPath,
      startTime: this.startTime.toISOString(),
      worktree: this.options.worktree,
      startDirectory: process.cwd(),
      instances,
    };
  }

  private getMainModel(): Model {
    const mainConfig = this.configHelper.getMainInstance();
    return mainConfig.model || 'opus';
  }

  private getMainDirectory(): string {
    const mainConfig = this.configHelper.getMainInstance();
    let directory = this.configHelper.getInstanceDirectory(mainConfig);

    // Map to worktree if enabled
    if (this.worktreeManager) {
      directory = this.worktreeManager.mapPathToWorktree(directory);
    }

    return directory;
  }

  private async launchMainInstance(): Promise<void> {
    const mainName = this.options.config.swarm.main;
    const mainConfig = this.configHelper.getMainInstance();
    const mainDirectory = this.getMainDirectory();
    const additionalDirs = this.configHelper
      .getAdditionalDirectories(mainConfig)
      .map((dir) => (this.worktreeManager ? this.worktreeManager.mapPathToWorktree(dir) : dir));

    // Build Claude command
    const args = this.buildClaudeArgs(mainName, mainConfig, mainDirectory, additionalDirs);

    // Log command
    this.logger.logInfo(mainName, 'Launching Claude', {
      command: 'claude',
      args,
      directory: mainDirectory,
    });

    // Launch Claude and replace current process
    spawn('claude', args, {
      cwd: mainDirectory,
      stdio: 'inherit',
      env: {
        ...process.env,
        DEVINE_SESSION: this.sessionPath.getSessionPath(),
      },
    });
  }

  private buildClaudeArgs(
    instanceName: string,
    config: InstanceConfig,
    _directory: string,
    additionalDirs: string[],
  ): string[] {
    const args: string[] = [];

    // Add model
    if (config.model) {
      args.push('--model', this.mapModel(config.model));
    }

    // Add additional directories
    additionalDirs.forEach((dir) => {
      args.push('--add-dir', dir);
    });

    // Add MCP config
    const mcpConfigPath = this.sessionPath.getMcpConfigPath(instanceName);
    args.push('--mcp-config', mcpConfigPath);

    // Add session restoration
    if (this.options.isRestoration) {
      const metadata = this.sessionPath.loadMetadata();
      const sessionId = metadata?.instances[instanceName]?.sessionId;
      if (sessionId) {
        args.push('--resume', sessionId);
      }
    }

    // Add tool permissions
    if (this.options.vibe || config.vibe) {
      args.push('--dangerously-skip-permissions');
    } else {
      const allowedTools = this.configHelper.getAllowedTools(instanceName);
      const disallowedTools = this.configHelper.getDisallowedTools(instanceName);

      if (allowedTools.length > 0) {
        args.push('--allowedTools', allowedTools.join(','));
      }
      if (disallowedTools.length > 0) {
        args.push('--disallowedTools', disallowedTools.join(','));
      }
    }

    // Build system prompt with context
    const systemPrompt = this.buildSystemPromptWithContext(instanceName, config);
    if (systemPrompt) {
      args.push('--append-system-prompt', systemPrompt);
    }

    // Handle prompt based on interactive mode
    if (this.options.interactive && instanceName === this.configHelper.getConfig().swarm.main) {
      // Interactive mode: don't use -p flag, append prompt to system prompt
      if (this.options.prompt) {
        const interactivePrompt = `\n\nInitial task: ${this.options.prompt}\n\nYou can interact with other agents using the MCP tools available.`;
        args[args.length - 1] += interactivePrompt;
      }
    } else {
      // Non-interactive mode: use -p flag
      if (this.options.prompt) {
        args.push('-p', this.options.prompt);
      }
    }

    return args;
  }

  private mapModel(model: Model): string {
    // Claude CLI expects model aliases, not full names
    return model;
  }

  private buildSystemPromptWithContext(instanceName: string, config: InstanceConfig): string {
    const contextManager = new ContextManager(this.options.config.swarm.name);
    const context = contextManager.buildInstanceContext(instanceName);

    let systemPrompt = config.prompt || '';

    // Inject context if available
    if (
      Object.keys(context).length > 1 ||
      (Object.keys(context).length === 1 && !context._contextMeta)
    ) {
      // Remove metadata before displaying
      const { _contextMeta, ...displayContext } = context;

      const contextSection = `
## Persistent Context

The following context is available from previous sessions:

\`\`\`json
${JSON.stringify(displayContext, null, 2)}
\`\`\`

Consider this context when performing your tasks.
`;

      systemPrompt = systemPrompt ? `${systemPrompt}\n\n${contextSection}` : contextSection;
    }

    // Add workbench instructions
    if (this.workbenchManager) {
      const isMainInstance = instanceName === this.options.config.swarm.main;
      const workbenchInstructions = isMainInstance
        ? this.workbenchManager.getOrchestratorInstructions()
        : this.workbenchManager.getWorkbenchInstructions();

      systemPrompt = systemPrompt
        ? `${systemPrompt}\n\n${workbenchInstructions}`
        : workbenchInstructions;
    }

    return systemPrompt;
  }

  private async cleanup(): Promise<void> {
    this.logger.info('system', 'Cleaning up...');

    // Clean up worktrees
    if (this.worktreeManager) {
      try {
        await this.worktreeManager.cleanup();
      } catch (error) {
        this.logger.error('Failed to cleanup worktrees', { error });
      }
    }

    // Clean up processes
    await this.processTracker.cleanup();

    // Remove current symlink
    this.sessionPath.removeCurrentSymlink();

    // Close logger
    this.logger.close();
  }
}
