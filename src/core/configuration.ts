import { readFileSync, existsSync, statSync } from 'fs';
import { load } from 'js-yaml';
import { homedir } from 'os';
import { resolve, isAbsolute, join, dirname } from 'path';
import type { SwarmConfig, InstanceConfig, Provider, Model } from '../types';

export class Configuration {
  private config: SwarmConfig;
  private configPath?: string;

  constructor(configOrPath: string | SwarmConfig) {
    if (typeof configOrPath === 'string') {
      this.configPath = resolve(configOrPath);
      this.config = this.loadConfig();
    } else {
      this.config = configOrPath;
    }
    this.validate();
  }

  private loadConfig(): SwarmConfig {
    if (!this.configPath || !existsSync(this.configPath)) {
      throw new Error(`Configuration file not found: ${this.configPath}`);
    }

    try {
      const content = readFileSync(this.configPath, 'utf8');
      const config = load(content) as SwarmConfig;

      if (!config || typeof config !== 'object') {
        throw new Error('Invalid YAML format');
      }

      return config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse configuration: ${error.message}`);
      }
      throw error;
    }
  }

  private validate(): void {
    // Validate version
    if (this.config.version !== 1) {
      throw new Error(`Unsupported configuration version: ${this.config.version}`);
    }

    // Validate swarm structure
    if (!this.config.swarm) {
      throw new Error('Missing "swarm" configuration');
    }

    const { swarm } = this.config;

    if (!swarm.name) {
      throw new Error('Missing swarm name');
    }

    if (!swarm.main) {
      throw new Error('Missing main instance');
    }

    if (!swarm.instances || Object.keys(swarm.instances).length === 0) {
      throw new Error('No instances defined');
    }

    // Validate main instance exists
    if (!swarm.instances[swarm.main]) {
      throw new Error(`Main instance "${swarm.main}" not found in instances`);
    }

    // Validate each instance
    Object.entries(swarm.instances).forEach(([name, instance]) => {
      this.validateInstance(name, instance);
    });

    // Validate connections
    this.validateConnections();
  }

  private validateInstance(name: string, instance: InstanceConfig): void {
    // Description is required
    if (!instance.description) {
      throw new Error(`Instance "${name}" missing required description`);
    }

    // Validate directories
    if (instance.directory) {
      const directories = Array.isArray(instance.directory)
        ? instance.directory
        : [instance.directory];

      directories.forEach((dir) => {
        const expandedDir = this.expandPath(dir);
        if (!existsSync(expandedDir)) {
          throw new Error(`Directory not found for instance "${name}": ${expandedDir}`);
        }
        if (!statSync(expandedDir).isDirectory()) {
          throw new Error(`Path is not a directory for instance "${name}": ${expandedDir}`);
        }
      });
    }

    // Validate model
    if (instance.model) {
      const validModels: Model[] = [
        'opus',
        'sonnet',
        'haiku',
        'gpt-4o',
        'gpt-4-turbo',
        'gpt-3.5-turbo',
      ];
      if (!validModels.includes(instance.model)) {
        throw new Error(`Invalid model "${instance.model}" for instance "${name}"`);
      }
    }

    // Validate provider
    if (instance.provider) {
      const validProviders: Provider[] = ['claude', 'openai'];
      if (!validProviders.includes(instance.provider)) {
        throw new Error(`Invalid provider "${instance.provider}" for instance "${name}"`);
      }
    }

    // Validate OpenAI specific fields
    if (instance.provider === 'openai') {
      if (
        instance.api_version &&
        !['chat_completion', 'responses'].includes(instance.api_version)
      ) {
        throw new Error(`Invalid api_version "${instance.api_version}" for instance "${name}"`);
      }
    }

    // Validate MCP servers
    if (instance.mcps) {
      instance.mcps.forEach((mcp, index) => {
        if (!mcp.name) {
          throw new Error(`MCP server ${index} missing name in instance "${name}"`);
        }
        if (!mcp.type) {
          throw new Error(`MCP server "${mcp.name}" missing type in instance "${name}"`);
        }
        if (mcp.type === 'stdio' && !mcp.command) {
          throw new Error(`stdio MCP server "${mcp.name}" missing command in instance "${name}"`);
        }
        if (mcp.type === 'sse' && !mcp.url) {
          throw new Error(`sse MCP server "${mcp.name}" missing url in instance "${name}"`);
        }
      });
    }
  }

  private validateConnections(): void {
    const instances = Object.keys(this.config.swarm.instances);

    Object.entries(this.config.swarm.instances).forEach(([name, instance]) => {
      if (instance.connections) {
        instance.connections.forEach((connection) => {
          if (!instances.includes(connection)) {
            throw new Error(`Instance "${name}" has unknown connection "${connection}"`);
          }
          if (connection === name) {
            throw new Error(`Instance "${name}" cannot connect to itself`);
          }
        });
      }
    });

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (instanceName: string): boolean => {
      visited.add(instanceName);
      recursionStack.add(instanceName);

      const instance = this.config.swarm.instances[instanceName];
      if (instance?.connections) {
        for (const connection of instance.connections) {
          if (!visited.has(connection)) {
            if (hasCycle(connection)) return true;
          } else if (recursionStack.has(connection)) {
            return true;
          }
        }
      }

      recursionStack.delete(instanceName);
      return false;
    };

    for (const instanceName of instances) {
      if (!visited.has(instanceName)) {
        if (hasCycle(instanceName)) {
          throw new Error('Circular dependency detected in instance connections');
        }
      }
    }
  }

  private expandPath(path: string): string {
    if (path.startsWith('~')) {
      return join(homedir(), path.slice(1));
    }
    if (!isAbsolute(path)) {
      // If we have a config path, resolve relative to its directory
      if (this.configPath) {
        const configDir = dirname(this.configPath);
        return resolve(configDir, path);
      }
      return resolve(path);
    }
    return path;
  }

  getConfig(): SwarmConfig {
    return this.config;
  }

  getConfigPath(): string {
    if (!this.configPath) {
      throw new Error('Configuration was created from object, not from file');
    }
    return this.configPath;
  }

  getMainInstance(): InstanceConfig {
    return this.config.swarm.instances[this.config.swarm.main]!;
  }

  getInstance(name: string): InstanceConfig | undefined {
    return this.config.swarm.instances[name];
  }

  getInstanceDirectory(instance: InstanceConfig): string {
    if (!instance.directory) {
      return process.cwd();
    }

    const directories = Array.isArray(instance.directory)
      ? instance.directory
      : [instance.directory];

    return this.expandPath(directories[0]!);
  }

  getAdditionalDirectories(instance: InstanceConfig): string[] {
    if (!instance.directory || !Array.isArray(instance.directory)) {
      return [];
    }

    return instance.directory.slice(1).map((dir) => this.expandPath(dir));
  }

  getAllowedTools(instanceName: string): string[] {
    const instance = this.getInstance(instanceName);
    if (!instance) return [];

    // If vibe mode, all tools are allowed
    if (instance.vibe) return [];

    // Use allowed_tools if present, otherwise fall back to tools
    const tools = instance.allowed_tools || instance.tools || [];

    // Add connection tools
    if (instance.connections) {
      instance.connections.forEach((connection) => {
        tools.push(`mcp__${connection}`);
      });
    }

    return tools;
  }

  getDisallowedTools(instanceName: string): string[] {
    const instance = this.getInstance(instanceName);
    return instance?.disallowed_tools || [];
  }
}
