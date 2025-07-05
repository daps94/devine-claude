import { Readable, Writable } from 'stream';
import * as readline from 'readline';
import {
  JsonRpcRequest,
  JsonRpcResponse,
  McpMethod,
  McpTool,
  CallToolParams,
  createJsonRpcResponse,
  createJsonRpcError,
  isJsonRpcRequest,
  JsonRpcErrorCode,
  McpErrorCode,
} from './protocol';

export interface McpToolHandler {
  execute(args: Record<string, any>): Promise<any>;
}

export interface McpServerOptions {
  name: string;
  version?: string;
  input?: Readable;
  output?: Writable;
}

export class McpServer {
  private tools: Map<string, { definition: McpTool; handler: McpToolHandler }> = new Map();
  private input: Readable;
  private output: Writable;
  private rl: readline.Interface;
  private name: string;
  private version: string;
  private isShuttingDown = false;

  constructor(options: McpServerOptions) {
    this.name = options.name || 'devine-mcp';
    this.version = options.version || '1.0.0';
    this.input = options.input || process.stdin;
    this.output = options.output || process.stdout;

    this.rl = readline.createInterface({
      input: this.input,
      output: undefined, // Don't echo input
      terminal: false,
    });
  }

  registerTool(definition: McpTool, handler: McpToolHandler): void {
    this.tools.set(definition.name, { definition, handler });
  }

  async start(): Promise<void> {
    this.rl.on('line', async (line) => {
      try {
        await this.handleMessage(line);
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    this.rl.on('close', () => {
      this.shutdown();
    });

    // Handle process signals
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  private async handleMessage(line: string): Promise<void> {
    let request: JsonRpcRequest;

    try {
      const parsed = JSON.parse(line);
      if (!isJsonRpcRequest(parsed)) {
        // If it's not a request, ignore it (might be a notification)
        return;
      }
      request = parsed;
    } catch (error) {
      // Send parse error
      const errorResponse = createJsonRpcResponse(
        0,
        undefined,
        createJsonRpcError(JsonRpcErrorCode.ParseError, 'Parse error'),
      );
      this.sendResponse(errorResponse);
      return;
    }

    try {
      const response = await this.handleRequest(request);
      this.sendResponse(response);
    } catch (error) {
      const errorResponse = createJsonRpcResponse(
        request.id,
        undefined,
        createJsonRpcError(
          JsonRpcErrorCode.InternalError,
          error instanceof Error ? error.message : 'Internal error',
        ),
      );
      this.sendResponse(errorResponse);
    }
  }

  private async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    switch (request.method) {
      case McpMethod.ListTools:
        return this.handleListTools(request);

      case McpMethod.CallTool:
        return this.handleCallTool(request);

      default:
        return createJsonRpcResponse(
          request.id,
          undefined,
          createJsonRpcError(
            JsonRpcErrorCode.MethodNotFound,
            `Method not found: ${request.method}`,
          ),
        );
    }
  }

  private handleListTools(request: JsonRpcRequest): JsonRpcResponse {
    const tools = Array.from(this.tools.values()).map((t) => t.definition);
    return createJsonRpcResponse(request.id, { tools });
  }

  private async handleCallTool(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const params = request.params as CallToolParams;

    if (!params || !params.name) {
      return createJsonRpcResponse(
        request.id,
        undefined,
        createJsonRpcError(JsonRpcErrorCode.InvalidParams, 'Missing tool name'),
      );
    }

    const tool = this.tools.get(params.name);
    if (!tool) {
      return createJsonRpcResponse(
        request.id,
        undefined,
        createJsonRpcError(McpErrorCode.ToolNotFound, `Tool not found: ${params.name}`),
      );
    }

    try {
      const result = await tool.handler.execute(params.arguments || {});
      return createJsonRpcResponse(request.id, result);
    } catch (error) {
      return createJsonRpcResponse(
        request.id,
        undefined,
        createJsonRpcError(
          McpErrorCode.ToolExecutionError,
          error instanceof Error ? error.message : 'Tool execution error',
          error instanceof Error ? { stack: error.stack } : undefined,
        ),
      );
    }
  }

  private sendResponse(response: JsonRpcResponse): void {
    if (!this.isShuttingDown) {
      this.output.write(JSON.stringify(response) + '\n');
    }
  }

  private shutdown(): void {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.rl.close();

    // Don't close stdin/stdout if they're the process streams
    if (this.input !== process.stdin) {
      this.input.destroy();
    }
    if (this.output !== process.stdout) {
      this.output.end();
    }
  }

  async stop(): Promise<void> {
    this.shutdown();
  }
}
