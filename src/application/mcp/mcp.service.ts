import { Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { McpMessage } from '../../domain/mcp/shared/mcp-message.interface.js';
import type { McpToolDefinition } from '../../domain/mcp/shared/tool-definition.interface.js';
import type {
  McpServerInfo,
  ToolErrorResponse,
  ToolResponse,
} from '../../domain/mcp/shared/tool-response.interface.js';
import type { IMcpRuntime } from './mcp-runtime.interface.js';
import { McpRuntimeResolverService } from './runtime-resolver.service.js';

/**
 * 単一エンドポイント向けMCPファサードサービス
 */
@Injectable()
export class McpService {
  private readonly runtime: IMcpRuntime;

  constructor(private readonly resolverService: McpRuntimeResolverService) {
    this.runtime = this.resolverService.resolveRuntime();
  }

  async handleHttpMcpMessage(message: McpMessage): Promise<unknown> {
    return await this.runtime.handleHttpMcpMessage(message);
  }

  async executeToolByName(
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<unknown> {
    return await this.runtime.executeToolByName(toolName, input);
  }

  getHttpToolsDefinition(): McpToolDefinition[] {
    return this.runtime.getHttpToolsDefinition();
  }

  getMcpInfoResponse(): McpServerInfo {
    return this.runtime.getMcpInfoResponse();
  }

  handleHttpMcpError(error: unknown, messageId?: string): never {
    return this.runtime.handleHttpMcpError(error, messageId);
  }

  formatToolResponse(result: unknown): ToolResponse {
    return this.runtime.formatToolResponse(result);
  }

  formatToolError(error: unknown): ToolErrorResponse {
    return this.runtime.formatToolError(error);
  }

  handleSSEConnection(
    reply: FastifyReply,
    request: FastifyRequest,
  ): FastifyReply {
    return this.runtime.handleSSEConnection(reply, request);
  }

  async handleStreamableHttpRequest(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    await this.runtime.handleStreamableHttpRequest(request, reply);
  }
}
