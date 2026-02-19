import { Injectable } from '@nestjs/common';
import { McpToolWithDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import { McpToolDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import { ToolResponse } from '../../../../domain/mcp/shared/tool-response.interface.js';
import { RdbmsAdapterFactory } from '../../../../infrastructure/rdbms/adapters/rdbms-adapter-factory.js';
import { AppConfigProvider } from '../../../../infrastructure/config/app-config.provider.js';
import { ReadQueryArguments } from '../../../../domain/mcp/rdbms/rdbms-tools.interface.js';

/**
 * データベース読み取りクエリツール
 */
@Injectable()
export class ReadQueryTool implements McpToolWithDefinition<
  ReadQueryArguments,
  ToolResponse
> {
  readonly name = 'read_query';

  constructor(private readonly appConfigProvider: AppConfigProvider) {}

  /**
   * ツールの定義情報を取得します
   * @returns ツール定義
   */
  getDefinition(): McpToolDefinition {
    return {
      name: 'read_query',
      description:
        'Execute a read-only SQL query (SELECT statements) against the connected database',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The SQL SELECT query to execute',
          },
        },
        required: ['query'],
      },
    };
  }

  /**
   * データベースの読み取りクエリを実行します
   * @param args クエリ実行引数
   * @returns クエリ実行結果
   */
  async execute(args: ReadQueryArguments): Promise<ToolResponse> {
    try {
      const connectionConfig =
        this.appConfigProvider.getDefaultDatabaseConfig();
      const adapter = RdbmsAdapterFactory.create(connectionConfig);
      await adapter.init();

      const results = await adapter.all(args.query, []);

      await adapter.close();

      return {
        content: [
          {
            type: 'text',
            text: `Query results: ${JSON.stringify(results, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing query: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
}
