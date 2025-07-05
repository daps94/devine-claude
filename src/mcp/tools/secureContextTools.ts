import { Tool } from 'claude-mcp-server';
import {
  SecureContextManager,
  SharedFinding,
  FindingFilter,
} from '../../core/secureContextManager';

// Tool to get agent's own context
export const getAgentContextTool: Tool = {
  name: 'get_agent_context',
  description: 'Get your own persisted context from previous sessions',
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'Optional specific key to retrieve. If not provided, returns all context.',
      },
    },
  },
  async execute(params: any, context: any) {
    try {
      const projectPath = process.cwd();
      const agentName = context.instanceName || 'unknown';
      const manager = new SecureContextManager(projectPath);

      const agentContext = await manager.getContext(agentName);

      if (!agentContext) {
        return {
          success: true,
          message: 'No context found',
          data: null,
        };
      }

      if (params.key) {
        return {
          success: true,
          data: agentContext.data[params.key] || null,
        };
      }

      return {
        success: true,
        data: agentContext.data,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};

// Tool to save agent's context
export const saveAgentContextTool: Tool = {
  name: 'save_agent_context',
  description: 'Save context for your future sessions',
  inputSchema: {
    type: 'object',
    properties: {
      data: {
        type: 'object',
        description: 'Context data to save (will be merged with existing)',
      },
      replace: {
        type: 'boolean',
        description: 'Replace all existing context instead of merging',
        default: false,
      },
    },
    required: ['data'],
  },
  async execute(params: any, context: any) {
    try {
      const projectPath = process.cwd();
      const agentName = context.instanceName || 'unknown';
      const manager = new SecureContextManager(projectPath);

      let dataToSave = params.data;

      if (!params.replace) {
        // Merge with existing context
        const existing = await manager.getContext(agentName);
        if (existing) {
          dataToSave = { ...existing.data, ...params.data };
        }
      }

      await manager.saveContext(agentName, dataToSave);

      return {
        success: true,
        message: 'Context saved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};

// Tool to share findings with other agents
export const shareFindingTool: Tool = {
  name: 'share_finding',
  description: 'Share an important finding with other agents',
  inputSchema: {
    type: 'object',
    properties: {
      severity: {
        type: 'string',
        enum: ['critical', 'high', 'medium', 'low'],
        description: 'Severity level of the finding',
      },
      type: {
        type: 'string',
        enum: ['vulnerability', 'performance', 'test-gap', 'architecture'],
        description: 'Type of finding',
      },
      affected: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of affected files or components',
      },
      summary: {
        type: 'string',
        description: 'Brief description of the finding',
      },
      details: {
        type: 'object',
        description: 'Additional details about the finding',
      },
    },
    required: ['severity', 'type', 'affected', 'summary'],
  },
  async execute(params: any, context: any) {
    try {
      const projectPath = process.cwd();
      const agentName = context.instanceName || 'unknown';
      const manager = new SecureContextManager(projectPath);

      await manager.shareFinding({
        source: agentName,
        severity: params.severity,
        type: params.type,
        affected: params.affected,
        summary: params.summary,
        details: params.details,
      });

      return {
        success: true,
        message: 'Finding shared successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};

// Tool to get shared findings
export const getSharedFindingsTool: Tool = {
  name: 'get_shared_findings',
  description: 'Get findings shared by other agents',
  inputSchema: {
    type: 'object',
    properties: {
      severity: {
        type: 'string',
        enum: ['critical', 'high', 'medium', 'low'],
        description: 'Filter by severity',
      },
      type: {
        type: 'string',
        enum: ['vulnerability', 'performance', 'test-gap', 'architecture'],
        description: 'Filter by type',
      },
      source: {
        type: 'string',
        description: 'Filter by source agent',
      },
      since: {
        type: 'string',
        description: 'Filter findings since this ISO timestamp',
      },
    },
  },
  async execute(params: any, context: any) {
    try {
      const projectPath = process.cwd();
      const manager = new SecureContextManager(projectPath);

      const filter: FindingFilter = {};
      if (params.severity) filter.severity = params.severity;
      if (params.type) filter.type = params.type;
      if (params.source) filter.source = params.source;
      if (params.since) filter.since = params.since;

      const findings = await manager.getSharedFindings(
        Object.keys(filter).length > 0 ? filter : undefined,
      );

      return {
        success: true,
        findings,
        count: findings.length,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};

// Tool to check if re-analysis is needed
export const checkReanalysisTool: Tool = {
  name: 'check_reanalysis_needed',
  description: 'Check if files have changed since last analysis',
  inputSchema: {
    type: 'object',
    properties: {
      paths: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of file paths to check',
      },
      lastHash: {
        type: 'string',
        description: 'Hash from previous analysis',
      },
    },
    required: ['paths'],
  },
  async execute(params: any, context: any) {
    try {
      const projectPath = process.cwd();
      const manager = new SecureContextManager(projectPath);

      const needsReanalysis = await manager.needsReanalysis(params.paths, params.lastHash);

      return {
        success: true,
        needsReanalysis,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};

// Tool to get/save repo state
export const repoStateTool: Tool = {
  name: 'repo_state',
  description: 'Get or save shared repository state',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['get', 'save'],
        description: 'Action to perform',
      },
      data: {
        type: 'object',
        description: 'State data to save (required for save action)',
      },
    },
    required: ['action'],
  },
  async execute(params: any, context: any) {
    try {
      const projectPath = process.cwd();
      const manager = new SecureContextManager(projectPath);

      if (params.action === 'get') {
        const state = await manager.getRepoState();
        return {
          success: true,
          data: state,
        };
      } else if (params.action === 'save') {
        if (!params.data) {
          return {
            success: false,
            error: 'Data required for save action',
          };
        }
        await manager.saveRepoState(params.data);
        return {
          success: true,
          message: 'Repo state saved successfully',
        };
      }

      return {
        success: false,
        error: 'Invalid action',
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};

// Export all secure context tools
export const secureContextTools = [
  getAgentContextTool,
  saveAgentContextTool,
  shareFindingTool,
  getSharedFindingsTool,
  checkReanalysisTool,
  repoStateTool,
];
