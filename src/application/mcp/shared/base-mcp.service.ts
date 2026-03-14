import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeAny } from 'zod';
import type { McpMessage } from '../../../domain/mcp/shared/mcp-message.interface.js';
import type { McpMethodHandler } from '../../../domain/mcp/shared/method-handler.interface.js';
import type { McpToolDefinition } from '../../../domain/mcp/shared/tool-definition.interface.js';
import type { McpToolWithDefinition } from '../../../domain/mcp/shared/tool-definition.interface.js';
import type {
  McpServerInfo,
  ToolErrorResponse,
  ToolResponse,
} from '../../../domain/mcp/shared/tool-response.interface.js';
import type { IMcpRuntime } from '../mcp-runtime.interface.js';

interface McpRpcError extends Error {
  code?: number;
  id?: string;
}

export interface BaseMcpRuntimeServerConfig {
  info: McpServerInfo;
  streamableName: string;
  streamableVersion: string;
}

export interface BaseMcpRuntimeLogConfig {
  httpProcessPrefix: string;
  httpErrorPrefix: string;
  sseRequested: string;
  sseClosed: string;
  streamableErrorPrefix: string;
}

export interface BaseMcpRuntimeToolFilterConfig {
  enabledTools: string[];
  envName: string;
  scopeLabel: string;
}

export interface BaseMcpRuntimeConfig {
  loggerContext: string;
  tools: McpToolWithDefinition[];
  allSchemas: Record<string, ZodTypeAny>;
  server: BaseMcpRuntimeServerConfig;
  logs: BaseMcpRuntimeLogConfig;
  toolFilter: BaseMcpRuntimeToolFilterConfig;
}

/**
 * RDBMS/NoSQL共通のMCPランタイム基底クラス
 */
export abstract class BaseMcpService implements IMcpRuntime {
  private readonly logger: Logger;
  private readonly tools: McpToolWithDefinition[];
  private readonly methodHandlers: McpMethodHandler[];

  constructor(
    private readonly config: BaseMcpRuntimeConfig,
    methodHandlersFactory: (
      tools: McpToolWithDefinition[],
    ) => McpMethodHandler[],
  ) {
    this.logger = new Logger(this.config.loggerContext);
    this.tools = this.filterToolsByConfig(this.config.tools);
    this.methodHandlers = methodHandlersFactory(this.tools);
  }

  async handleHttpMcpMessage(message: McpMessage): Promise<unknown> {
    this.logger.debug(`${this.config.logs.httpProcessPrefix}: ${message.method}`);
    return await this.dispatchHttpMcpMethod(message);
  }

  async executeToolByName(
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<unknown> {
    const tool = this.tools.find((candidate) => candidate.name === toolName);
    if (!tool) {
      const error = new Error(`Unknown tool: ${toolName}`);
      error.name = 'UnknownToolError';
      throw error;
    }

    return await tool.execute(input);
  }

  getHttpToolsDefinition(): McpToolDefinition[] {
    return this.tools.map((tool) => tool.getDefinition());
  }

  getMcpInfoResponse(): McpServerInfo {
    return this.config.server.info;
  }

  handleHttpMcpError(error: unknown, messageId?: string): never {
    this.logger.error(
      `${this.config.logs.httpErrorPrefix}: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error.stack : undefined,
    );

    const rpcError = this.toRpcError(error);

    if (rpcError?.name === 'MethodNotFoundError') {
      throw new HttpException(
        {
          jsonrpc: '2.0',
          id: rpcError.id || messageId,
          error: { code: -32601, message: rpcError.message },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (rpcError?.name === 'UnknownToolError') {
      throw new HttpException(rpcError.message, HttpStatus.BAD_REQUEST);
    }

    throw new HttpException(
      {
        jsonrpc: '2.0',
        id: messageId,
        error: {
          code: -32603,
          message: 'Internal error',
          data: rpcError?.message ?? String(error),
        },
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  formatToolResponse(result: unknown): ToolResponse {
    return {
      content: [
        {
          type: 'text',
          text:
            typeof result === 'string'
              ? result
              : JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  formatToolError(error: unknown): ToolErrorResponse {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }

  handleSSEConnection(
    reply: FastifyReply,
    request: FastifyRequest,
  ): FastifyReply {
    this.logger.debug(this.config.logs.sseRequested);
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    const initMessage = {
      jsonrpc: '2.0',
      method: 'initialized',
      params: {
        serverInfo: {
          name: this.config.server.streamableName,
          version: this.config.server.streamableVersion,
        },
        capabilities: {
          tools: {
            listChanged: false,
          },
        },
      },
    };

    reply.raw.write(`data: ${JSON.stringify(initMessage)}\n\n`);

    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 30000);

    request.raw.on('close', () => {
      this.logger.debug(this.config.logs.sseClosed);
      clearInterval(heartbeat);
    });

    return reply;
  }

  async handleStreamableHttpRequest(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    this.ensureAcceptHeader(request);
    this.ensureContentTypeHeader(request);
    const { server, transport } = this.createStreamableContext();
    this.hijackReply(reply, server, transport);
    await this.runStreamableHandling(request, reply, server, transport);
  }

  private async dispatchHttpMcpMethod(message: McpMessage): Promise<unknown> {
    const handler = this.methodHandlers.find((item) => item.method === message.method);
    if (!handler) {
      throw this.createMethodNotFoundError(message.id, message.method);
    }

    return await handler.handle(message);
  }

  private ensureAcceptHeader(request: FastifyRequest): void {
    const acceptHeader = request.raw.headers['accept'];
    const accept = Array.isArray(acceptHeader)
      ? acceptHeader.join(',')
      : acceptHeader;

    const needsJson = !accept?.includes('application/json');
    const needsSse = !accept?.includes('text/event-stream');

    if (needsJson || needsSse || !accept) {
      request.raw.headers['accept'] = 'application/json, text/event-stream';
    }
  }

  private ensureContentTypeHeader(request: FastifyRequest): void {
    if (request.raw.method !== 'POST') {
      return;
    }

    const contentType = request.raw.headers['content-type'];
    if (!contentType) {
      request.raw.headers['content-type'] = 'application/json';
    }
  }

  private createStreamableContext(): {
    server: McpServer;
    transport: StreamableHTTPServerTransport;
  } {
    return {
      server: this.createStreamableMcpServer(),
      transport: this.createStreamableTransport(),
    };
  }

  private createStreamableMcpServer(): McpServer {
    const server = new McpServer({
      name: this.config.server.streamableName,
      version: this.config.server.streamableVersion,
    });
    this.registerStreamableTools(server, this.getStreamableSchemas());
    return server;
  }

  private getStreamableSchemas(): Record<string, ZodTypeAny> {
    const enabledSchemas: Record<string, ZodTypeAny> = {};

    this.tools.forEach((tool) => {
      const schema = this.config.allSchemas[tool.name];
      if (schema) {
        enabledSchemas[tool.name] = schema;
      }
    });

    return enabledSchemas;
  }

  private registerStreamableTools(
    server: McpServer,
    schemas: Record<string, ZodTypeAny>,
  ): void {
    this.tools.forEach((tool) => {
      const schema = schemas[tool.name];
      if (!schema) {
        return;
      }
      this.registerStreamableTool(server, tool.name, schema, tool);
    });
  }

  private registerStreamableTool(
    server: McpServer,
    name: string,
    schema: ZodTypeAny,
    tool: McpToolWithDefinition,
  ): void {
    const definition = tool.getDefinition();

    server.registerTool(
      name,
      {
        description: definition.description,
        inputSchema: schema,
      },
      async (args: Record<string, unknown>): Promise<CallToolResult> => {
        const result = await tool.execute(args);
        return {
          content: [
            {
              type: 'text' as const,
              text:
                typeof result === 'string'
                  ? result
                  : JSON.stringify(result, null, 2),
            },
          ],
        };
      },
    );
  }

  private createStreamableTransport(): StreamableHTTPServerTransport {
    return new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
  }

  private hijackReply(
    reply: FastifyReply,
    server: McpServer,
    transport: StreamableHTTPServerTransport,
  ): void {
    reply.hijack();
    reply.raw.on('close', () => {
      void this.closeStreamableContext(server, transport);
    });
  }

  private async runStreamableHandling(
    request: FastifyRequest,
    reply: FastifyReply,
    server: McpServer,
    transport: StreamableHTTPServerTransport,
  ): Promise<void> {
    try {
      await server.connect(transport);
      const body = request.method === 'POST' ? request.body : undefined;
      await transport.handleRequest(request.raw, reply.raw, body);
    } catch (error) {
      this.logger.error(
        `${this.config.logs.streamableErrorPrefix}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (!reply.raw.writableEnded) {
        reply.raw.writeHead(500, { 'Content-Type': 'application/json' });
        reply.raw.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal error' },
            id: null,
          }),
        );
      }

      await this.closeStreamableContext(server, transport);
    }
  }

  async connectStdio(): Promise<void> {
    const { StdioServerTransport } = await import(
      '@modelcontextprotocol/sdk/server/stdio.js'
    );
    const server = this.createStreamableMcpServer();
    const transport = new StdioServerTransport();

    const cleanup = async (): Promise<void> => {
      try {
        await transport.close();
      } catch {
        // クリーンアップ失敗は握り潰す
      }
      try {
        await server.close();
      } catch {
        // クリーンアップ失敗は握り潰す
      }
      process.exit(0);
    };

    process.on('SIGINT', () => {
      void cleanup();
    });
    process.on('SIGTERM', () => {
      void cleanup();
    });

    await server.connect(transport);
  }

  private async closeStreamableContext(
    server: McpServer,
    transport: StreamableHTTPServerTransport,
  ): Promise<void> {
    try {
      await transport.close();
    } catch {
      // トランスポートクローズ失敗時でもサーバークローズは試行する
    }

    try {
      await server.close();
    } catch {
      // サーバークローズ失敗は握り潰して処理を継続
    }
  }

  private createMethodNotFoundError(
    messageId: string | undefined,
    method: string,
  ): McpRpcError {
    const error = new Error(`Method not found: ${method}`) as McpRpcError;
    error.name = 'MethodNotFoundError';
    error.code = -32601;
    error.id = messageId;
    return error;
  }

  private toRpcError(error: unknown): McpRpcError | undefined {
    if (typeof error === 'object' && error !== null && 'name' in error) {
      return error as McpRpcError;
    }
    return undefined;
  }

  private filterToolsByConfig(
    allTools: McpToolWithDefinition[],
  ): McpToolWithDefinition[] {
    const enabledTools = this.config.toolFilter.enabledTools;

    if (enabledTools.length === 0) {
      this.logger.log(
        `No ${this.config.toolFilter.envName} specified. All ${this.config.toolFilter.scopeLabel}tools are enabled.`,
      );
      return allTools;
    }

    const allToolNames = allTools.map((tool) => tool.name);
    const normalizedEnabledTools = enabledTools.map((name) => name.toLowerCase());
    const toolNameMap = new Map(
      allTools.map((tool) => [tool.name.toLowerCase(), tool]),
    );

    normalizedEnabledTools.forEach((enabledName) => {
      if (!toolNameMap.has(enabledName)) {
        this.logger.warn(
          `Unknown tool name in ${this.config.toolFilter.envName}: "${enabledName}". Available tools: ${allToolNames.join(', ')}`,
        );
      }
    });

    const filteredTools = allTools.filter((tool) =>
      normalizedEnabledTools.includes(tool.name.toLowerCase()),
    );

    this.logger.log(
      `Enabled ${filteredTools.length} ${this.config.toolFilter.scopeLabel}tools: ${filteredTools
        .map((tool) => tool.name)
        .join(', ')}`,
    );

    return filteredTools;
  }
}
