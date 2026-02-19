import { Injectable } from '@nestjs/common';
import { McpToolWithDefinition } from '../../../domain/mcp/tools/tool-definition.interface.js';
import { McpToolDefinition } from '../../../domain/mcp/tools/tool-definition.interface.js';
import { ToolResponse } from '../../../domain/mcp/tool-response.interface.js';
import { DatabaseAdapterFactory } from '../../../infrastructure/database/adapters/database-adapter-factory.js';
import { AppConfigProvider } from '../../../infrastructure/config/app-config.provider.js';
import { WriteQueryArguments } from '../../../domain/mcp/tools/database-tools.interface.js';

/**
 * データベース書き込みクエリツール
 */
@Injectable()
export class WriteQueryTool implements McpToolWithDefinition<
  WriteQueryArguments,
  ToolResponse
> {
  readonly name = 'write_query';

  constructor(private readonly appConfigProvider: AppConfigProvider) {}

  /**
   * ツールの定義情報を取得します
   * @returns ツール定義
   */
  getDefinition(): McpToolDefinition {
    return {
      name: 'write_query',
      description:
        'Execute a data modification SQL query (INSERT, UPDATE, DELETE) against the connected database',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The SQL modification query to execute',
          },
        },
        required: ['query'],
      },
    };
  }

  /**
   * データベースの書き込みクエリを実行します
   * @param args クエリ実行引数
   * @returns クエリ実行結果
   */
  async execute(args: WriteQueryArguments): Promise<ToolResponse> {
    try {
      const connectionConfig =
        this.appConfigProvider.getDefaultDatabaseConfig();
      const adapter = DatabaseAdapterFactory.create(connectionConfig);
      await adapter.init();

      const result = await adapter.run(args.query, []);

      await adapter.close();

      return {
        content: [
          {
            type: 'text',
            text: `Query executed successfully. Changes: ${result.changes}, Last ID: ${result.lastID}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing write query: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
}
