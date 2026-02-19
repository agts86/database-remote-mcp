import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AppConfigProvider } from '../../infrastructure/config/app-config.provider.js';
import { ReadQueryTool } from './tools/read-query.tool.js';
import { WriteQueryTool } from './tools/write-query.tool.js';
import { ExportQueryTool } from './tools/export-query.tool.js';
import { ListTablesTool } from './tools/list-tables.tool.js';
import { DescribeTableTool } from './tools/describe-table.tool.js';
import { GetSchemaTool } from './tools/get-schema.tool.js';
import { CreateTableTool } from './tools/create-table.tool.js';
import { AlterTableTool } from './tools/alter-table.tool.js';
import { DropTableTool } from './tools/drop-table.tool.js';
import { ListInsightsTool } from './tools/list-insights.tool.js';
import { AppendInsightTool } from './tools/append-insight.tool.js';
import {
  McpToolDefinition,
  McpToolWithDefinition,
} from '../../domain/mcp/tools/tool-definition.interface.js';
import { McpMethodHandler } from '../../domain/mcp/method-handler.interface.js';
import { McpMessage } from '../../domain/mcp/mcp-message.interface.js';
import {
  ToolResponse,
  ToolErrorResponse,
  McpServerInfo,
} from '../../domain/mcp/tool-response.interface.js';
import {
  InitializeHandler,
  NotificationsInitializedHandler,
  LoggingSetLevelHandler,
  ToolsListHandler,
} from '../mcp/handlers/method-handlers.js';
import { DatabaseToolsCallHandler } from './handlers/database-tools-call.handler.js';
import { FastifyReply, FastifyRequest } from 'fastify';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

interface McpRpcError extends Error {
  code?: number;
  id?: string;
}

/**
 * データベース統合サービス
 * HTTPモード専用のデータベースMCPツール実行サービス
 */
@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);
  private readonly tools: McpToolWithDefinition[];
  private readonly methodHandlers: McpMethodHandler[];

  /**
   * McpServiceのインスタンスを作成します
   * @param appConfigProvider - アプリケーション設定プロバイダー
   * @param readQueryTool - 読み取りクエリツール
   * @param writeQueryTool - 書き込みクエリツール
   * @param exportQueryTool - エクスポートクエリツール
   * @param listTablesTool - テーブル一覧ツール
   * @param describeTableTool - テーブル説明ツール
   * @param getSchemaTool - スキーマ取得ツール
   * @param createTableTool - テーブル作成ツール
   * @param alterTableTool - テーブル変更ツール
   * @param dropTableTool - テーブル削除ツール
   * @param listInsightsTool - インサイト一覧ツール
   * @param appendInsightTool - インサイト追加ツール
   */
  constructor(
    private readonly appConfigProvider: AppConfigProvider,
    private readonly readQueryTool: ReadQueryTool,
    private readonly writeQueryTool: WriteQueryTool,
    private readonly exportQueryTool: ExportQueryTool,
    private readonly listTablesTool: ListTablesTool,
    private readonly describeTableTool: DescribeTableTool,
    private readonly getSchemaTool: GetSchemaTool,
    private readonly createTableTool: CreateTableTool,
    private readonly alterTableTool: AlterTableTool,
    private readonly dropTableTool: DropTableTool,
    private readonly listInsightsTool: ListInsightsTool,
    private readonly appendInsightTool: AppendInsightTool,
  ) {
    // 全ツールを配列で管理
    const allTools = [
      this.readQueryTool,
      this.writeQueryTool,
      this.exportQueryTool,
      this.listTablesTool,
      this.describeTableTool,
      this.getSchemaTool,
      this.createTableTool,
      this.alterTableTool,
      this.dropTableTool,
      this.listInsightsTool,
      this.appendInsightTool,
    ];

    // 環境変数でツールフィルタリング
    this.tools = this.filterToolsByConfig(allTools);

    // メソッドハンドラーをクラスベースで管理
    this.methodHandlers = [
      new InitializeHandler(),
      new NotificationsInitializedHandler(),
      new LoggingSetLevelHandler(),
      new ToolsListHandler(this.tools),
      new DatabaseToolsCallHandler(this.tools),
    ];
  }

  /**
   * 環境変数に基づいてツールをフィルタリング
   * @param allTools - 全ツールの配列
   * @returns フィルタリングされたツールの配列
   */
  private filterToolsByConfig(
    allTools: McpToolWithDefinition[],
  ): McpToolWithDefinition[] {
    const enabledToolNames = this.appConfigProvider.enabledTools;

    // 環境変数未設定の場合は全ツールを有効化
    if (enabledToolNames.length === 0) {
      this.logger.log('No ENABLED_TOOLS specified. All tools are enabled.');
      return allTools;
    }

    // 全ツール名を取得（バリデーション用）
    const allToolNames = allTools.map((t) => t.name);

    // 大文字小文字を区別せずにツール名を正規化
    const normalizedEnabledTools = enabledToolNames.map((name) =>
      name.toLowerCase(),
    );
    const toolNameMap = new Map(allTools.map((t) => [t.name.toLowerCase(), t]));

    // 該当しないツール名を検出して警告
    normalizedEnabledTools.forEach((enabledName) => {
      if (!toolNameMap.has(enabledName)) {
        this.logger.warn(
          `Unknown tool name in ENABLED_TOOLS: "${enabledName}". Available tools: ${allToolNames.join(', ')}`,
        );
      }
    });

    // フィルタリング実行
    const filteredTools = allTools.filter((tool) =>
      normalizedEnabledTools.includes(tool.name.toLowerCase()),
    );

    this.logger.log(
      `Enabled ${filteredTools.length} tools: ${filteredTools.map((t) => t.name).join(', ')}`,
    );

    return filteredTools;
  }

  // --- HTTP MCP プロトコル処理メソッド ---

  /**
   * HTTP MCPメッセージを処理する
   * @param message - MCPメッセージ
   * @param authHeader - 認証ヘッダー（オプション）
   * @returns 処理結果
   */
  async handleHttpMcpMessage(message: McpMessage): Promise<unknown> {
    this.logger.debug(`Processing HTTP MCP message: ${message.method}`);
    return await this.dispatchHttpMcpMethod(message);
  }

  /**
   * HTTP MCPメソッドのディスパッチ処理
   * @param message - MCPメッセージ
   * @param authHeader - 認証ヘッダー（オプション）
   * @returns メソッド実行結果
   * @throws メソッドが見つからない場合にエラーをスロー
   */
  private async dispatchHttpMcpMethod(message: McpMessage): Promise<unknown> {
    const method = message.method;
    const handler = this.methodHandlers.find((h) => h.method === method);

    if (!handler) {
      const error = this.createMethodNotFoundError(message.id, method);
      throw error;
    }

    return await handler.handle(message);
  }

  /**
   * ツール名によるツール実行（HTTP用）
   * @param toolName - 実行するツール名
   * @param input - ツールの入力パラメータ
   * @returns ツール実行結果
   * @throws ツールが見つからない場合にエラーをスロー
   */
  async executeToolByName(
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<unknown> {
    const tool = this.tools.find((t) => t.name === toolName);
    if (!tool) {
      const error = new Error(`Unknown tool: ${toolName}`);
      error.name = 'UnknownToolError';
      throw error;
    }

    return await tool.execute(input);
  }

  /**
   * HTTP用ツール定義を取得（動的生成）
   * @returns ツール定義の配列
   */
  getHttpToolsDefinition(): McpToolDefinition[] {
    return this.tools.map((tool) => tool.getDefinition());
  }

  /**
   * メソッド未対応エラーの生成
   * @param messageId - メッセージID
   * @param method - 未対応のメソッド名
   * @throws メソッド未対応エラーをスロー
   */
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

  /**
   * 例外をMCPエラー構造として扱えるように変換します
   */
  private toRpcError(error: unknown): McpRpcError | undefined {
    if (typeof error === 'object' && error !== null && 'name' in error) {
      return error as McpRpcError;
    }
    return undefined;
  }

  /**
   * MCP Server Info の取得
   * @returns サーバー情報
   */
  getMcpInfoResponse(): McpServerInfo {
    return {
      name: 'database-remote-mcp',
      version: '0.1.0',
      description: 'DataBase Remote  Database MCP Server - HTTP API',
      capabilities: {
        tools: true,
        resources: false,
        prompts: false,
      },
      endpoints: {
        tools: '/mcp/tools',
        listTools: '/mcp/tools',
        invokeTool: '/mcp/tools/{toolName}',
      },
    };
  }

  /**
   * MCPエラーレスポンスを返すためのヘルパーメソッド
   */
  handleHttpMcpError(error: unknown, messageId?: string): never {
    this.logger.error(
      `HTTP MCP Message handling error: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error.stack : undefined,
    );

    const rpcError = this.toRpcError(error);

    if (rpcError?.name === 'MethodNotFoundError') {
      throw new HttpException(
        {
          jsonrpc: '2.0',
          id: rpcError.id || messageId,
          error: {
            code: -32601,
            message: rpcError.message,
          },
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

  /**
   * ツールレスポンスをフォーマット
   * @param result ツールの実行結果
   * @returns フォーマット済みレスポンス
   */
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

  /**
   * ツールエラーをフォーマット
   * @param error エラーオブジェクト
   * @returns フォーマット済みエラーレスポンス
   */
  formatToolError(error: unknown): ToolErrorResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }

  /**
   * SSE (Server-Sent Events) 接続を処理する
   * @param reply - Fastifyレスポンスオブジェクト
   * @param request - Fastifyリクエストオブジェクト
   * @returns レスポンスオブジェクト
   */
  handleSSEConnection(
    reply: FastifyReply,
    request: FastifyRequest,
  ): FastifyReply {
    this.logger.debug('SSE connection requested');

    // Fastifyの自動レスポンス処理を停止し、手動でSSEレスポンスを制御
    reply.hijack();

    // SSEヘッダーを設定
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // MCP初期化メッセージを送信
    const initMessage = {
      jsonrpc: '2.0',
      method: 'initialized',
      params: {
        serverInfo: {
          name: 'database-remote-mcp',
          version: '0.1.0',
        },
        capabilities: {
          tools: {
            listChanged: false,
          },
        },
      },
    };

    reply.raw.write(`data: ${JSON.stringify(initMessage)}\n\n`);

    // キープアライブハートビート
    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 30000);

    // クリーンアップ
    request.raw.on('close', () => {
      this.logger.debug('SSE connection closed');
      clearInterval(heartbeat);
    });

    return reply;
  }

  /**
   * Codexが期待する Streamable HTTP MCP エンドポイントを処理
   * @param request - Fastifyリクエスト
   * @param reply - Fastifyレスポンス
   */
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
  /**
   * CodexクライアントがAcceptを省略する場合に備え、必須ヘッダーを補完
   */
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
  /**
   * Content-Type: application/json が無い場合に補完 (POST時の 415 回避)
   */
  private ensureContentTypeHeader(request: FastifyRequest): void {
    if (request.raw.method !== 'POST') {
      return;
    }

    const contentType = request.raw.headers['content-type'];
    if (!contentType) {
      request.raw.headers['content-type'] = 'application/json';
    }
  }

  /**
   * Streamable HTTP用のサーバー/トランスポートをまとめて生成
   */
  private createStreamableContext(): {
    server: McpServer;
    transport: StreamableHTTPServerTransport;
  } {
    return {
      server: this.createStreamableMcpServer(),
      transport: this.createStreamableTransport(),
    };
  }

  /**
   * Fastifyレスポンスをtransportに委譲し、クローズ時にクリーンアップ
   */
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

  /**
   * Streamable HTTP の実行本体
   */
  private async runStreamableHandling(
    request: FastifyRequest,
    reply: FastifyReply,
    server: McpServer,
    transport: StreamableHTTPServerTransport,
  ): Promise<void> {
    try {
      await server.connect(transport);
      // GET リクエストの場合は body が undefined になるため、undefined を渡す
      const body = request.method === 'POST' ? request.body : undefined;
      await transport.handleRequest(request.raw, reply.raw, body);
    } catch (error) {
      this.logger.error(
        `Streamable HTTP handling error: ${error instanceof Error ? error.message : String(error)}`,
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

  /**
   * Streamable HTTP用のZodスキーマを取得（全ツール定義）
   */
  private getAllStreamableSchemas(): Record<string, z.ZodTypeAny> {
    return {
      read_query: z.object({ query: z.string() }),
      write_query: z.object({ query: z.string() }),
      export_query: z.object({
        query: z.string(),
        format: z.enum(['csv', 'json']),
      }),
      list_tables: z.object({}),
      describe_table: z.object({ table_name: z.string() }),
      get_schema: z.object({}),
      create_table: z.object({ query: z.string() }),
      alter_table: z.object({ query: z.string() }),
      drop_table: z.object({ table_name: z.string(), confirm: z.boolean() }),
      list_insights: z.object({}),
      append_insight: z.object({ insight: z.string() }),
    };
  }

  /**
   * フィルタリング済みツールのZodスキーマのみを取得
   */
  private getStreamableSchemas(): Record<string, z.ZodTypeAny> {
    const allSchemas = this.getAllStreamableSchemas();
    const enabledSchemas: Record<string, z.ZodTypeAny> = {};

    // フィルタリング済みツールのスキーマのみを抽出
    this.tools.forEach((tool) => {
      if (allSchemas[tool.name]) {
        enabledSchemas[tool.name] = allSchemas[tool.name];
      }
    });

    return enabledSchemas;
  }

  /**
   * Streamable HTTP用のMCPサーバーインスタンスを作成
   */
  private createStreamableMcpServer(): McpServer {
    const server = new McpServer({
      name: 'database-remote-mcp',
      version: '0.1.0',
    });

    const schemas = this.getStreamableSchemas();
    this.registerStreamableTools(server, schemas);

    return server;
  }

  /**
   * Streamable HTTP用にフィルタリング済みツールのみを登録
   */
  private registerStreamableTools(
    server: McpServer,
    schemas: ReturnType<McpService['getStreamableSchemas']>,
  ): void {
    // フィルタリング済みツール(this.tools)のみを登録
    this.tools.forEach((tool) => {
      const schema = schemas[tool.name];
      if (schema) {
        this.registerStreamableTool(server, tool.name, schema, tool);
      }
    });
  }

  /**
   * 個別ツールをStreamable HTTPサーバーに登録
   */
  private registerStreamableTool(
    server: McpServer,
    name: string,
    schema: z.ZodTypeAny,
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

  /**
   * Streamable HTTP トランスポートを作成
   */
  private createStreamableTransport(): StreamableHTTPServerTransport {
    return new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
  }

  /**
   * Streamable HTTP のサーバー/トランスポートをクローズ
   */
  private async closeStreamableContext(
    server: McpServer,
    transport: StreamableHTTPServerTransport,
  ): Promise<void> {
    try {
      await server.close();
    } catch {
      // クローズ時のエラーは無視 (既にクローズ済みの可能性)
    }
  }
}
