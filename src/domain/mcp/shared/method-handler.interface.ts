/**
 * MCPメソッドハンドラーのインターフェース
 */
import type { McpMessage } from './mcp-message.interface.js';

export interface McpMethodHandler<Params = unknown, Response = unknown> {
  /**
   * ハンドラーが対応するメソッド名
   */
  readonly method: string;

  /**
   * メソッドを処理します
   * @param message MCPメッセージ
   * @returns レスポンス
   */
  handle(message: McpMessage<Params>): Promise<Response> | Response;
}
