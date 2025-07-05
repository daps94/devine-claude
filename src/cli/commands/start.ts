import { existsSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';
import { Configuration } from '../../core/configuration';
import { Orchestrator } from '../../core/orchestrator';
import { SessionPath } from '../../core/sessionPath';
import { commandExists } from '../../utils/system';
import type { CommandOptions } from '../../types';

export async function startCommand(options: CommandOptions): Promise<void> {
  // Check Claude CLI
  if (!commandExists('claude')) {
    console.error(chalk.red('Error: Claude CLI not found'));
    console.error('Please install it first:');
    console.error(chalk.cyan('  npm install -g @anthropic-ai/claude-code'));
    process.exit(1);
  }

  // Resolve config path
  const configPath = resolve(options.config || 'devine.yml');

  if (!existsSync(configPath)) {
    console.error(chalk.red(`Configuration file not found: ${configPath}`));
    console.error('Run', chalk.cyan('devine init'), 'to create one');
    process.exit(1);
  }

  // Handle session restoration
  let sessionPath: SessionPath;
  let isRestoration = false;

  if (options.sessionId) {
    const foundSession = SessionPath.findSession(options.sessionId);
    if (!foundSession) {
      console.error(chalk.red(`Session not found: ${options.sessionId}`));
      process.exit(1);
    }
    sessionPath = new SessionPath(undefined, options.sessionId);
    isRestoration = true;

    // Load existing config from session
    const sessionConfigPath = sessionPath.getConfigPath();
    if (!existsSync(sessionConfigPath)) {
      console.error(chalk.red(`Session config not found: ${sessionConfigPath}`));
      process.exit(1);
    }
  } else {
    sessionPath = new SessionPath();
  }

  try {
    // Load configuration
    const configuration = new Configuration(configPath);
    const config = configuration.getConfig();

    // Determine worktree name
    let worktreeName: string | undefined;
    if (options.worktree !== undefined) {
      if (typeof options.worktree === 'string' && options.worktree.trim()) {
        worktreeName = options.worktree;
      } else {
        worktreeName = `worktree-${sessionPath.getSessionPath().split('/').pop()}`;
      }
    }

    // Create orchestrator
    const orchestrator = new Orchestrator({
      config,
      configPath,
      sessionPath: sessionPath.getSessionPath(),
      vibe: options.vibe || false,
      prompt: options.prompt,
      worktree: worktreeName,
      isRestoration,
      interactive: options.interactive,
    });

    // Start the swarm
    await orchestrator.start();
  } catch (error) {
    console.error(chalk.red('Failed to start swarm:'), error);
    process.exit(1);
  }
}
