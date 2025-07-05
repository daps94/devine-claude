import { existsSync } from 'fs';
import { resolve } from 'path';
import { Configuration } from '../../core/configuration';
import { SessionPath } from '../../core/sessionPath';
import { McpServer } from '../../mcp/server';
import { TaskTool, SessionInfoTool, ResetSessionTool } from '../../mcp/tools';
import {
  getAgentContextTool,
  saveAgentContextTool,
  shareFindingTool,
  getSharedFindingsTool,
  checkReanalysisTool,
  repoStateTool,
} from '../../mcp/tools/secureContextTools';
import { ClaudeExecutor } from '../../executors/claude';
import { OpenAIExecutor } from '../../executors/openai';
import { Logger } from '../../utils/logger';
import { WorktreeManager } from '../../utils/worktree';

interface McpServeOptions {
  config: string;
  sessionPath: string;
  instanceId: string;
}

export async function mcpServeCommand(
  instanceName: string,
  options: McpServeOptions,
): Promise<void> {
  try {
    // Load configuration
    const configuration = new Configuration(options.config);
    const instanceConfig = configuration.getInstance(instanceName);

    if (!instanceConfig) {
      throw new Error(`Instance "${instanceName}" not found in configuration`);
    }

    // Set up session paths
    const sessionPath = new SessionPath(undefined, options.sessionPath.split('/').pop());
    const logger = new Logger(sessionPath.getSessionPath());

    // Get instance directory
    let directory = configuration.getInstanceDirectory(instanceConfig);
    const additionalDirs = configuration.getAdditionalDirectories(instanceConfig);

    // Handle worktree mapping if needed
    const metadata = sessionPath.loadMetadata();
    if (metadata?.worktree) {
      const worktreeManager = new WorktreeManager(sessionPath.getWorktreePath(), logger);

      // Set up worktree for this instance
      const worktreeName =
        typeof instanceConfig.worktree === 'string' ? instanceConfig.worktree : metadata.worktree;

      if (instanceConfig.worktree !== false && worktreeName) {
        directory = await worktreeManager.setupWorktree({
          directory,
          worktreeName,
          basePath: sessionPath.getWorktreePath(),
        });
      }
    }

    // Load MCP config
    const mcpConfigPath = sessionPath.getMcpConfigPath(instanceName);

    // Create executor based on provider
    let executor: any;
    const provider = instanceConfig.provider || 'claude';

    if (provider === 'openai') {
      executor = new OpenAIExecutor({
        instanceName,
        instanceConfig,
        directory,
        mcpConfigPath: existsSync(mcpConfigPath) ? mcpConfigPath : undefined,
        logger,
        sessionId: metadata?.instances[instanceName]?.sessionId,
      });
    } else {
      executor = new ClaudeExecutor({
        instanceName,
        instanceConfig,
        directory,
        additionalDirectories: additionalDirs,
        mcpConfigPath: existsSync(mcpConfigPath) ? mcpConfigPath : undefined,
        allowedTools: configuration.getAllowedTools(instanceName),
        disallowedTools: configuration.getDisallowedTools(instanceName),
        sessionId: metadata?.instances[instanceName]?.sessionId,
        logger,
        vibe: instanceConfig.vibe || false,
      });
    }

    // Create MCP server
    const server = new McpServer({
      name: `devine-${instanceName}`,
      version: '1.0.0',
    });

    // Register tools
    const taskTool = new TaskTool({
      instanceName,
      instanceConfig,
      executor,
    });
    server.registerTool(taskTool.getDefinition(), taskTool);

    const sessionInfoTool = new SessionInfoTool({
      instanceName,
      instanceId: options.instanceId,
      directory,
      executor,
      sessionPath: sessionPath.getSessionPath(),
    });
    server.registerTool(sessionInfoTool.getDefinition(), sessionInfoTool);

    const resetSessionTool = new ResetSessionTool({
      instanceName,
      executor,
    });
    server.registerTool(resetSessionTool.getDefinition(), resetSessionTool);

    // Register secure context tools
    const contextHandler = {
      execute: async (args: any) => {
        return await getAgentContextTool.execute(args, { instanceName });
      },
    };
    server.registerTool(getAgentContextTool, contextHandler);

    const saveContextHandler = {
      execute: async (args: any) => {
        return await saveAgentContextTool.execute(args, { instanceName });
      },
    };
    server.registerTool(saveAgentContextTool, saveContextHandler);

    const shareFindingHandler = {
      execute: async (args: any) => {
        return await shareFindingTool.execute(args, { instanceName });
      },
    };
    server.registerTool(shareFindingTool, shareFindingHandler);

    const getSharedFindingsHandler = {
      execute: async (args: any) => {
        return await getSharedFindingsTool.execute(args, { instanceName });
      },
    };
    server.registerTool(getSharedFindingsTool, getSharedFindingsHandler);

    const checkReanalysisHandler = {
      execute: async (args: any) => {
        return await checkReanalysisTool.execute(args, { instanceName });
      },
    };
    server.registerTool(checkReanalysisTool, checkReanalysisHandler);

    const repoStateHandler = {
      execute: async (args: any) => {
        return await repoStateTool.execute(args, { instanceName });
      },
    };
    server.registerTool(repoStateTool, repoStateHandler);

    // Start server
    logger.info(instanceName, `Starting MCP server for instance ${instanceName}`);
    await server.start();

    // Keep process alive
    process.on('SIGINT', async () => {
      logger.info(instanceName, 'Shutting down MCP server');
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('MCP serve error:', error);
    process.exit(1);
  }
}
