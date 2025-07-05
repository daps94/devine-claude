// MCP Protocol definitions based on JSON-RPC 2.0

export const JSONRPC_VERSION = '2.0';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

// MCP specific methods
export enum McpMethod {
  // Discovery
  ListTools = 'mcp/listTools',

  // Tool execution
  CallTool = 'mcp/callTool',

  // Session management
  GetSessionInfo = 'mcp/getSessionInfo',
  ResetSession = 'mcp/resetSession',
}

// MCP tool call parameters
export interface CallToolParams {
  name: string;
  arguments?: Record<string, any>;
}

// MCP tool definition
export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// MCP list tools response
export interface ListToolsResponse {
  tools: McpTool[];
}

// Standard JSON-RPC error codes
export enum JsonRpcErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
}

// MCP specific error codes
export enum McpErrorCode {
  ToolNotFound = -32001,
  ToolExecutionError = -32002,
  SessionError = -32003,
}

export function createJsonRpcRequest(
  method: string,
  params?: any,
  id?: string | number,
): JsonRpcRequest {
  return {
    jsonrpc: JSONRPC_VERSION,
    id: id ?? Date.now(),
    method,
    params,
  };
}

export function createJsonRpcResponse(
  id: string | number,
  result?: any,
  error?: JsonRpcError,
): JsonRpcResponse {
  const response: JsonRpcResponse = {
    jsonrpc: JSONRPC_VERSION,
    id,
  };

  if (error) {
    response.error = error;
  } else {
    response.result = result ?? null;
  }

  return response;
}

export function createJsonRpcError(code: number, message: string, data?: any): JsonRpcError {
  return { code, message, data };
}

export function isJsonRpcRequest(obj: any): obj is JsonRpcRequest {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.jsonrpc === JSONRPC_VERSION &&
    'id' in obj &&
    typeof obj.method === 'string'
  );
}

export function isJsonRpcNotification(obj: any): obj is JsonRpcNotification {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.jsonrpc === JSONRPC_VERSION &&
    !('id' in obj) &&
    typeof obj.method === 'string'
  );
}
