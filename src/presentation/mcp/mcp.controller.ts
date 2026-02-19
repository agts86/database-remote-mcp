import {
  Controller,
  Post,
  Body,
  Param,
  UseInterceptors,
  Get,
  Logger,
  All,
  Req,
  Res,
} from '@nestjs/common';
import { SSEInterceptor } from './sse.interceptor.js';
import { McpService } from '../../application/mcp/mcp.service.js';
import type { McpMessage } from '../../domain/mcp/shared/mcp-message.interface.js';
import type { McpToolDefinition } from '../../domain/mcp/shared/tool-definition.interface.js';
import type {
  ToolResponse,
  ToolErrorResponse,
  McpServerInfo,
} from '../../domain/mcp/shared/tool-response.interface.js';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Database ToolのHTTP APIコントローラー
 * ユーザーが指定したHTTPベース設定に対応し、データベースツールをHTTPエンドポイントで公開します
 */
@Controller('mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);

  /**
   * McpControllerのインスタンスを作成します
   * @param McpService - データベースサービス
   */
  constructor(private readonly McpService: McpService) {}

  /**
   * MCPプロトコルのベースエンドポイント
   * MCPクライアントが最初にアクセスするエンドポイント
   * SSE処理はSSEInterceptorで自動処理される
   */
  @Get()
  @UseInterceptors(SSEInterceptor)
  getMcpInfo(): McpServerInfo {
    this.logger.debug('Database MCP base endpoint accessed - START');
    // SSE処理はインターセプターが自動処理
    // 通常のJSONレスポンスのみここで処理
    return this.McpService.getMcpInfoResponse();
  }
  /**
   * Streamable HTTP エンドポイント (GET/POST/DELETE 全対応)
   */
  @All('stream')
  async handleStreamable(
    @Req() request: FastifyRequest,
    @Res({ passthrough: false }) reply: FastifyReply,
  ): Promise<void> {
    this.logger.debug('Streamable MCP endpoint accessed');
    await this.McpService.handleStreamableHttpRequest(request, reply);
  }

  /**
   * MCPプロトコルのPOSTリクエストを処理（initialize, tools/list, tools/call等）
   * @param body - リクエストボディ
   * @param authHeader - Authorizationヘッダー（オプション）
   * @returns MCPレスポンス
   */
  @Post()
  async handleMcpPost(@Body() body: McpMessage): Promise<unknown> {
    this.logger.debug(`Database MCP POST Message: ${JSON.stringify(body)}`);

    try {
      const ret = await this.McpService.handleHttpMcpMessage(body);
      return ret;
    } catch (error) {
      return this.McpService.handleHttpMcpError(error, body?.id);
    }
  }

  /**
   * 利用可能なツール一覧を取得
   * @returns ツール一覧レスポンス
   */
  @Get('tools')
  getTools(): { tools: McpToolDefinition[] } {
    return {
      tools: this.McpService.getHttpToolsDefinition(),
    };
  }

  /**
   * ツールを実行し、結果を返す
   * @param toolName ツール名
   * @param input ツールの入力パラメータ
   * @param authHeader Authorization ヘッダー
   */
  @Post('tools/:toolName')
  async invokeTool(
    @Param('toolName') toolName: string,
    @Body() input: Record<string, unknown>,
  ): Promise<ToolResponse | ToolErrorResponse> {
    this.logger.debug(
      `Database tool invocation: ${toolName} with input: ${JSON.stringify(input)}`,
    );

    try {
      const result = await this.McpService.executeToolByName(toolName, input);
      return this.McpService.formatToolResponse(result);
    } catch (error) {
      return this.McpService.formatToolError(error);
    }
  }
}
