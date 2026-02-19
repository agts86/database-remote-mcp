import { Injectable, Logger } from '@nestjs/common';
import { McpMethodHandler } from '../../../domain/mcp/method-handler.interface.js';
import { McpMessage } from '../../../domain/mcp/mcp-message.interface.js';
import {
  McpBaseResponse,
  McpToolResult,
} from '../../../domain/mcp/mcp-response.interface.js';
import { McpToolWithDefinition } from '../../../domain/mcp/tools/tool-definition.interface.js';

/**
 * ツール実行要求パラメータ
 */
interface ToolsCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

/**
 * データベース用ツール実行ハンドラー
 * 認証なしでデータベースツールを実行します
 */
@Injectable()
export class DatabaseToolsCallHandler implements McpMethodHandler {
  readonly method = 'tools/call';
  private readonly logger = new Logger(DatabaseToolsCallHandler.name);

  /**
   * DatabaseToolsCallHandlerのインスタンスを作成します
   * @param tools - 利用可能なツールの配列
   */
  constructor(private readonly tools: McpToolWithDefinition[]) {}

  /**
   * ツール実行要求を処理します（認証なし）
   * @param message - MCPメッセージ
   * @returns ツール実行結果レスポンス
   */
  async handle(
    message: McpMessage<ToolsCallParams>,
  ): Promise<McpBaseResponse<McpToolResult>> {
    const { name, arguments: args } = message.params ?? {};

    try {
      const tool = this.tools.find((t) => t.name === name);
      if (!tool) {
        const error = new Error(`Unknown tool: ${name}`);
        error.name = 'UnknownToolError';
        throw error;
      }

      this.logger.debug(
        `Executing database tool: ${name} with args: ${JSON.stringify(args)}`,
      );

      // データベースツールは認証なしで実行
      const result = await tool.execute(args);

      return {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      };
    } catch (error) {
      this.logger.error(
        `Database tool execution error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error; // エラーは上位でMCPエラーレスポンスに変換される
    }
  }
}
