import { existsSync, writeFileSync } from 'fs';
import chalk from 'chalk';

const DEFAULT_CONFIG = `version: 1
swarm:
  name: "My Dev Team"
  main: lead
  instances:
    lead:
      description: "Team lead coordinating development efforts"
      directory: .
      model: opus
      connections: [frontend, backend]
      prompt: "You are the team lead coordinating development efforts"
      allowed_tools:
        - Read
        - Edit
        - Write
        - Bash
        - WebSearch
    
    frontend:
      description: "Frontend specialist handling UI and user experience"
      directory: ./frontend
      model: sonnet
      prompt: "You specialize in frontend development with modern frameworks"
      allowed_tools:
        - Read
        - Edit
        - Write
        - Bash
    
    backend:
      description: "Backend developer managing APIs and data layer"
      directory: ./backend
      model: sonnet
      prompt: "You specialize in backend development and API design"
      allowed_tools:
        - Read
        - Edit
        - Write
        - Bash
`;

export async function initCommand(options: { force?: boolean }): Promise<void> {
  const configPath = 'devine.yml';

  if (existsSync(configPath) && !options.force) {
    console.error(chalk.red(`Configuration file already exists: ${configPath}`));
    console.error('Use', chalk.cyan('--force'), 'to overwrite');
    process.exit(1);
  }

  try {
    writeFileSync(configPath, DEFAULT_CONFIG, 'utf8');
    console.log(chalk.green('✓'), `Created ${configPath}`);
    console.log('\nNext steps:');
    console.log('1. Edit', chalk.cyan(configPath), 'to customize your swarm');
    console.log('2. Run', chalk.cyan('devine'), 'to start your AI team');
    console.log('\nFor more examples, see:');
    console.log(chalk.gray('https://github.com/daps94/devine-claude/tree/main/examples'));
  } catch (error) {
    console.error(chalk.red('Failed to create configuration:'), error);
    process.exit(1);
  }
}
