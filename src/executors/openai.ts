import OpenAI from 'openai';
import { spawn } from 'child_process';
import split2 from 'split2';
import { Logger } from '../utils/logger';
import { BaseExecutor, ExecutorOptions, ExecutorStats } from './base';
import type { InstanceConfig, Model } from '../types';

export interface OpenAIExecutorOptions {
  instanceName: string;
  instanceConfig: InstanceConfig;
  directory: string;
  mcpConfigPath?: string;
  logger?: Logger;
  sessionId?: string;
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OpenAIExecutor extends BaseExecutor {
  private instanceName: string;
  private instanceConfig: InstanceConfig;
  private directory: string;
  private mcpConfigPath?: string;
  private logger?: Logger;
  private openai: OpenAI;
  private messages: Message[] = [];
  private mcpProcess?: any;

  constructor(options: OpenAIExecutorOptions) {
    super();

    this.instanceName = options.instanceName;
    this.instanceConfig = options.instanceConfig;
    this.directory = options.directory;
    this.mcpConfigPath = options.mcpConfigPath;
    this.logger = options.logger;
    this.sessionId = options.sessionId;

    // Initialize OpenAI client
    const apiKey = process.env[this.instanceConfig.openai_token_env || 'OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error(
        `OpenAI API key not found in environment variable: ${this.instanceConfig.openai_token_env || 'OPENAI_API_KEY'}`,
      );
    }

    this.openai = new OpenAI({
      apiKey,
      baseURL: this.instanceConfig.base_url,
    });

    // Initialize conversation with system prompt if provided
    if (this.instanceConfig.prompt) {
      this.messages.push({
        role: 'system',
        content: this.instanceConfig.prompt,
      });
    }

    // Start MCP server for tools if config provided
    if (this.mcpConfigPath) {
      this.startMcpBridge();
    }
  }

  private startMcpBridge(): void {
    // Launch claude mcp serve to bridge MCP tools
    const args = ['mcp', 'serve'];
    if (this.mcpConfigPath) {
      args.push('--config', this.mcpConfigPath);
    }

    this.mcpProcess = spawn('claude', args, {
      cwd: this.directory,
      env: process.env,
    });

    // TODO: Implement MCP client to communicate with the bridge
    // For now, OpenAI instances will work without MCP tools
  }

  async execute(options: ExecutorOptions): Promise<string> {
    // Add system prompt override if provided
    if (options.systemPrompt) {
      // Replace or add system message
      const systemIndex = this.messages.findIndex((m) => m.role === 'system');
      const systemMessage: Message = { role: 'system', content: options.systemPrompt };

      if (systemIndex >= 0) {
        this.messages[systemIndex] = systemMessage;
      } else {
        this.messages.unshift(systemMessage);
      }
    }

    // Add user message
    this.messages.push({
      role: 'user',
      content: options.prompt,
    });

    // Log request
    if (this.logger) {
      this.logger.logRequest(this.instanceName, {
        model: this.getModelName(),
        messages: this.messages,
        temperature: this.instanceConfig.temperature,
      });
    }

    try {
      const response = await this.callOpenAI();

      // Update stats
      this.stats.totalCalls++;
      if (response.usage) {
        this.stats.totalTokens = (this.stats.totalTokens || 0) + response.usage.total_tokens;
        // Estimate cost (prices may vary)
        const costPerToken = this.estimateCostPerToken();
        this.stats.totalCost += response.usage.total_tokens * costPerToken;
      }

      // Add assistant response to conversation
      const content = response.choices[0]?.message?.content || '';
      this.messages.push({
        role: 'assistant',
        content,
      });

      // Log response
      if (this.logger) {
        this.logger.logResponse(this.instanceName, response);
      }

      return content;
    } catch (error) {
      if (this.logger) {
        this.logger.logError(this.instanceName, error);
      }
      throw error;
    }
  }

  private async callOpenAI(): Promise<any> {
    if (this.instanceConfig.api_version === 'responses') {
      // Use the responses API (for structured output)
      return await this.openai.chat.completions.create({
        model: this.getModelName(),
        messages: this.messages as any,
        temperature: this.instanceConfig.temperature || 0.3,
        response_format: { type: 'json_object' },
      });
    } else {
      // Use standard chat completions
      return await this.openai.chat.completions.create({
        model: this.getModelName(),
        messages: this.messages as any,
        temperature: this.instanceConfig.temperature || 0.3,
      });
    }
  }

  private getModelName(): string {
    const model = this.instanceConfig.model || 'gpt-4o';

    // Map simplified names to full model names
    const modelMap: Record<string, string> = {
      'gpt-4o': 'gpt-4o',
      'gpt-4-turbo': 'gpt-4-turbo-preview',
      'gpt-3.5-turbo': 'gpt-3.5-turbo',
    };

    return modelMap[model] || model;
  }

  private estimateCostPerToken(): number {
    const model = this.getModelName();

    // Rough estimates (prices in USD per token)
    const costMap: Record<string, number> = {
      'gpt-4o': 0.00003,
      'gpt-4-turbo-preview': 0.00003,
      'gpt-3.5-turbo': 0.0000015,
    };

    return costMap[model] || 0.00003;
  }

  async resetSession(): Promise<void> {
    // Keep only system message
    this.messages = this.messages.filter((m) => m.role === 'system');
    this.sessionId = undefined;
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  getStats(): ExecutorStats {
    return { ...this.stats };
  }

  cleanup(): void {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = undefined;
    }
  }
}
