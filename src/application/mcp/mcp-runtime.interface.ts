import type { FastifyReply, FastifyRequest } from 'fastify';
import type { McpMessage } from '../../domain/mcp/shared/mcp-message.interface.js';
import type { McpToolDefinition } from '../../domain/mcp/shared/tool-definition.interface.js';
import type {
  McpServerInfo,
  ToolErrorResponse,
  ToolResponse,
} from '../../domain/mcp/shared/tool-response.interface.js';

/**
 * MCPランタイムの共通インターフェース
 */
export interface IMcpRuntime {
  handleHttpMcpMessage(message: McpMessage): Promise<unknown>;
  executeToolByName(
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<unknown>;
  getHttpToolsDefinition(): McpToolDefinition[];
  getMcpInfoResponse(): McpServerInfo;
  handleHttpMcpError(error: unknown, messageId?: string): never;
  formatToolResponse(result: unknown): ToolResponse;
  formatToolError(error: unknown): ToolErrorResponse;
  handleSSEConnection(reply: FastifyReply, request: FastifyRequest): FastifyReply;
  handleStreamableHttpRequest(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void>;
}
