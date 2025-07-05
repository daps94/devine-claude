import { writeFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import type {
  SwarmConfig,
  InstanceConfig,
  McpConfiguration,
  McpServerDefinition,
  SessionMetadata,
} from '../types';
import { Configuration } from '../core/configuration';
import { SessionPath } from '../core/sessionPath';

export class McpGenerator {
  private config: SwarmConfig;
  private sessionPath: SessionPath;
  private instanceIds: Map<string, string> = new Map();

  constructor(config: SwarmConfig, sessionPath: SessionPath) {
    this.config = config;
    this.sessionPath = sessionPath;
  }

  generateAll(metadata?: SessionMetadata): void {
    // Generate instance IDs
    this.generateInstanceIds(metadata);

    // Generate MCP config for each instance
    Object.entries(this.config.swarm.instances).forEach(([instanceName, instance]) => {
      const mcpConfig = this.generateInstanceConfig(instanceName, instance);
      const configPath = this.sessionPath.getMcpConfigPath(instanceName);
      writeFileSync(configPath, JSON.stringify(mcpConfig, null, 2), 'utf8');
    });
  }

  private generateInstanceIds(metadata?: SessionMetadata): void {
    Object.keys(this.config.swarm.instances).forEach((name) => {
      // If restoring, use existing instance IDs
      if (metadata?.instances[name]?.id) {
        this.instanceIds.set(name, metadata.instances[name].id);
      } else {
        // Generate new instance ID
        const hash = createHash('md5')
          .update(name + Date.now() + Math.random())
          .digest('hex')
          .substring(0, 8);
        this.instanceIds.set(name, `${name}_${hash}`);
      }
    });
  }

  private generateInstanceConfig(name: string, instance: InstanceConfig): McpConfiguration {
    const mcpServers: Record<string, McpServerDefinition> = {};

    // Add explicitly defined MCP servers
    if (instance.mcps) {
      instance.mcps.forEach((mcp) => {
        if (mcp.type === 'stdio') {
          mcpServers[mcp.name] = {
            type: 'stdio',
            command: mcp.command!,
            args: mcp.args,
            env: mcp.env,
          };
        } else if (mcp.type === 'sse') {
          mcpServers[mcp.name] = {
            type: 'sse',
            url: mcp.url!,
          };
        }
      });
    }

    // Add connection MCP servers
    if (instance.connections) {
      instance.connections.forEach((connectionName) => {
        const connectionInstance = this.config.swarm.instances[connectionName];
        if (!connectionInstance) return;

        const connectionId = this.instanceIds.get(connectionName);
        if (!connectionId) return;

        mcpServers[connectionName] = {
          type: 'stdio',
          command: process.argv[0]!, // node executable
          args: [
            join(__dirname, '..', 'cli', 'index.js'),
            'mcp-serve',
            connectionName,
            '--config',
            this.sessionPath.getConfigPath(),
            '--session-path',
            this.sessionPath.getSessionPath(),
            '--instance-id',
            connectionId || '',
          ],
          env: {
            NODE_ENV: process.env.NODE_ENV || 'production',
          },
        };
      });
    }

    return { mcpServers };
  }

  getInstanceId(name: string): string | undefined {
    return this.instanceIds.get(name);
  }

  getInstanceIds(): Map<string, string> {
    return new Map(this.instanceIds);
  }

  static async generateFromConfig(
    configPath: string,
    sessionPath: SessionPath,
    metadata?: SessionMetadata,
  ): Promise<McpGenerator> {
    const configuration = new Configuration(configPath);
    const generator = new McpGenerator(configuration.getConfig(), sessionPath);
    generator.generateAll(metadata);
    return generator;
  }
}
