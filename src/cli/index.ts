#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { startCommand } from './commands/start';
import { mcpServeCommand } from './commands/mcp-serve';
import { psCommand } from './commands/ps';
import { showCommand } from './commands/show';
import { watchCommand } from './commands/watch';
import { listSessionsCommand } from './commands/list-sessions';
import { cleanCommand } from './commands/clean';
import { initCommand } from './commands/init';
import { generateCommand } from './commands/generate';
import { contextGetCommand, contextSetCommand, contextDeleteCommand } from './commands/context';
import { version } from '../../package.json';

const program = new Command();

program
  .name('devine-claude')
  .description(
    'Devine orchestration for Claude Code - Transform Claude into a powerful multi-agent team',
  )
  .version(version);

// Default command (start)
program
  .argument('[config]', 'Path to configuration file', 'devine.yml')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('--vibe', 'Run with --dangerously-skip-permissions for all instances')
  .option('-p, --prompt <prompt>', 'Initial prompt to send to main instance')
  .option('--session-id <id>', 'Resume a previous session')
  .option('-w, --worktree [name]', 'Use Git worktrees for isolation')
  .option('-i, --interactive', 'Run main instance interactively (like normal Claude Code)')
  .action(async (configArg, options) => {
    try {
      const configPath = options.config || configArg;
      await startCommand({ ...options, config: configPath });
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Sub-commands
program
  .command('init')
  .description('Initialize a new Claude Swarm configuration file')
  .option('-f, --force', 'Overwrite existing configuration file')
  .action(initCommand);

program
  .command('generate')
  .description("Generate a Claude Swarm configuration interactively with Claude's help")
  .option('-o, --output <file>', 'Output file name')
  .option('--model <model>', 'Claude model to use', 'opus')
  .action(generateCommand);

program.command('ps').description('List running swarm sessions with costs').action(psCommand);

program
  .command('show <session-id>')
  .description('Show detailed information about a session')
  .action(showCommand);

program
  .command('watch <session-id>')
  .description('Watch live logs from a session')
  .option('-n, --lines <number>', 'Number of lines to show initially', '10')
  .action(watchCommand);

program
  .command('list-sessions')
  .description('List all available sessions')
  .option('--limit <number>', 'Maximum number of sessions to show', '10')
  .action(listSessionsCommand);

program
  .command('clean')
  .description('Clean up stale session symlinks and orphaned worktrees')
  .option('--days <number>', 'Remove sessions older than N days', '7')
  .action(cleanCommand);

program
  .command('mcp-serve <instance-name>')
  .description('Internal command for MCP server')
  .option('--config <path>', 'Path to configuration file')
  .option('--session-path <path>', 'Session directory path')
  .option('--instance-id <id>', 'Instance ID')
  .action(mcpServeCommand);

// Context management commands
const contextCmd = program
  .command('context')
  .description('Manage persistent context for swarm instances');

contextCmd
  .command('get [key]')
  .description('Get context value(s)')
  .option('-l, --level <level>', 'Context level (global, swarm, instance)', 'swarm')
  .option('-i, --instance <name>', 'Instance name (for instance level)')
  .option('--json', 'Output as JSON only')
  .option('-c, --config <path>', 'Path to configuration file')
  .action(contextGetCommand);

contextCmd
  .command('set <key> <value>')
  .description('Set a context value')
  .option('-l, --level <level>', 'Context level (global, swarm, instance)', 'swarm')
  .option('-i, --instance <name>', 'Instance name (for instance level)')
  .option('-c, --config <path>', 'Path to configuration file')
  .action(contextSetCommand);

contextCmd
  .command('delete [key]')
  .description('Delete a context key or clear all context')
  .option('-l, --level <level>', 'Context level (global, swarm, instance)', 'swarm')
  .option('-i, --instance <name>', 'Instance name (for instance level)')
  .option('-c, --config <path>', 'Path to configuration file')
  .action(contextDeleteCommand);

program
  .command('version')
  .description('Show version information')
  .action(() => {
    console.log(`devine-claude v${version}`);
  });

// Help command
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ devine-claude                         # Use default devine.yml');
  console.log('  $ devine-claude --config team.yml       # Use custom config file');
  console.log('  $ devine-claude --vibe                  # Run with all permissions');
  console.log('  $ devine-claude -p "Build a web app"    # Start with a prompt (headless)');
  console.log('  $ devine-claude -i                      # Run main instance interactively');
  console.log('  $ devine-claude -i -p "Fix the bug"     # Interactive with initial task');
  console.log('  $ devine-claude --session-id 20241206_143022  # Resume session');
  console.log('  $ devine-claude --worktree              # Use Git worktrees');
  console.log('');
  console.log('For more information, visit: https://github.com/daps94/devine-claude');
});

// Parse command line arguments
program.parse();
