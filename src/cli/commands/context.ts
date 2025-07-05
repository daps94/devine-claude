import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { ContextManager } from '../../core/contextManager';
import type { CommandOptions } from '../../types';

interface ContextCommandOptions extends CommandOptions {
  level?: 'global' | 'swarm' | 'instance';
  instance?: string;
  json?: boolean;
}

export async function contextGetCommand(
  key?: string,
  options: ContextCommandOptions = {},
): Promise<void> {
  try {
    const level = options.level || 'swarm';
    const swarmName = await getSwarmName(options);

    if (!swarmName && level !== 'global') {
      console.error(
        chalk.red('No swarm context found. Run from a swarm directory or specify --config'),
      );
      process.exit(1);
    }

    const contextManager = new ContextManager(swarmName || 'default');
    let context: any;

    switch (level) {
      case 'global':
        context = key ? contextManager.getGlobalContextKey(key) : contextManager.getGlobalContext();
        break;
      case 'swarm':
        context = key ? contextManager.getSwarmContextKey(key) : contextManager.getSwarmContext();
        break;
      case 'instance':
        if (!options.instance) {
          console.error(chalk.red('Instance name required for instance-level context'));
          process.exit(1);
        }
        context = key
          ? contextManager.getInstanceContextKey(options.instance, key)
          : contextManager.getInstanceContext(options.instance);
        break;
    }

    if (options.json) {
      console.log(JSON.stringify(context, null, 2));
    } else {
      if (key && context === undefined) {
        console.log(chalk.yellow(`Key "${key}" not found at ${level} level`));
      } else {
        console.log(chalk.cyan(`Context at ${level} level${key ? ` for key "${key}"` : ''}:`));
        console.log(JSON.stringify(context, null, 2));
      }
    }
  } catch (error) {
    console.error(chalk.red('Error getting context:'), error);
    process.exit(1);
  }
}

export async function contextSetCommand(
  key: string,
  value: string,
  options: ContextCommandOptions = {},
): Promise<void> {
  try {
    const level = options.level || 'swarm';
    const swarmName = await getSwarmName(options);

    if (!swarmName && level !== 'global') {
      console.error(
        chalk.red('No swarm context found. Run from a swarm directory or specify --config'),
      );
      process.exit(1);
    }

    const contextManager = new ContextManager(swarmName || 'default');

    // Try to parse value as JSON, fall back to string
    let parsedValue: any;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      parsedValue = value;
    }

    switch (level) {
      case 'global':
        contextManager.setGlobalContext(key, parsedValue);
        break;
      case 'swarm':
        contextManager.setSwarmContext(key, parsedValue);
        break;
      case 'instance':
        if (!options.instance) {
          console.error(chalk.red('Instance name required for instance-level context'));
          process.exit(1);
        }
        contextManager.setInstanceContext(options.instance, key, parsedValue);
        break;
    }

    console.log(chalk.green(`✓ Set context "${key}" at ${level} level`));
  } catch (error) {
    console.error(chalk.red('Error setting context:'), error);
    process.exit(1);
  }
}

export async function contextDeleteCommand(
  key?: string,
  options: ContextCommandOptions = {},
): Promise<void> {
  try {
    const level = options.level || 'swarm';
    const swarmName = await getSwarmName(options);

    if (!swarmName && level !== 'global') {
      console.error(
        chalk.red('No swarm context found. Run from a swarm directory or specify --config'),
      );
      process.exit(1);
    }

    const contextManager = new ContextManager(swarmName || 'default');
    let result: boolean;

    switch (level) {
      case 'global':
        if (key) {
          result = contextManager.deleteGlobalContext(key);
        } else {
          contextManager.clearGlobalContext();
          result = true;
        }
        break;
      case 'swarm':
        if (key) {
          result = contextManager.deleteSwarmContext(key);
        } else {
          contextManager.clearSwarmContext();
          result = true;
        }
        break;
      case 'instance':
        if (!options.instance) {
          console.error(chalk.red('Instance name required for instance-level context'));
          process.exit(1);
        }
        if (key) {
          result = contextManager.deleteInstanceContext(options.instance, key);
        } else {
          contextManager.clearInstanceContext(options.instance);
          result = true;
        }
        break;
      default:
        result = false;
    }

    if (result || !key) {
      console.log(
        chalk.green(`✓ ${key ? `Deleted "${key}"` : 'Cleared all context'} at ${level} level`),
      );
    } else {
      console.log(chalk.yellow(`Key "${key}" not found at ${level} level`));
    }
  } catch (error) {
    console.error(chalk.red('Error deleting context:'), error);
    process.exit(1);
  }
}

async function getSwarmName(options: ContextCommandOptions): Promise<string | null> {
  // Try to get swarm name from config file
  if (options.config) {
    try {
      const configContent = readFileSync(options.config, 'utf8');
      const config = JSON.parse(configContent);
      return config.swarm?.name || null;
    } catch {
      // Fall through to other methods
    }
  }

  // Try to find claude-swarm.yml in current directory
  const localConfigPath = join(process.cwd(), 'claude-swarm.yml');
  if (existsSync(localConfigPath)) {
    try {
      const yaml = await import('js-yaml');
      const configContent = readFileSync(localConfigPath, 'utf8');
      const config = yaml.load(configContent) as any;
      return config.swarm?.name || null;
    } catch {
      // Fall through
    }
  }

  // Try to get from current session
  const currentSessionPath = join(homedir(), '.claude-swarm', 'sessions', 'current');
  if (existsSync(currentSessionPath)) {
    try {
      const configPath = join(currentSessionPath, 'config.yml');
      if (existsSync(configPath)) {
        const yaml = await import('js-yaml');
        const configContent = readFileSync(configPath, 'utf8');
        const config = yaml.load(configContent) as any;
        return config.swarm?.name || null;
      }
    } catch {
      // Fall through
    }
  }

  return null;
}
