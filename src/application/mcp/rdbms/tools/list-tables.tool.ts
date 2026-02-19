import { Injectable } from '@nestjs/common';
import { McpToolWithDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import { McpToolDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import { ToolResponse } from '../../../../domain/mcp/shared/tool-response.interface.js';
import { RdbmsAdapterFactory } from '../../../../infrastructure/rdbms/adapters/rdbms-adapter-factory.js';
import { AppConfigProvider } from '../../../../infrastructure/config/app-config.provider.js';
import { ListTablesArguments } from '../../../../domain/mcp/rdbms/rdbms-tools.interface.js';

/**
 * データベーステーブル一覧ツール
 */
@Injectable()
export class ListTablesTool implements McpToolWithDefinition<
  ListTablesArguments,
  ToolResponse
> {
  readonly name = 'list_tables';

  constructor(private readonly appConfigProvider: AppConfigProvider) {}

  /**
   * ツールの定義情報を取得します
   * @returns ツール定義
   */
  getDefinition(): McpToolDefinition {
    return {
      name: 'list_tables',
      description: 'List all tables in the connected database',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };
  }

  /**
   * データベース内のテーブル一覧を取得します
   * @param args テーブル一覧取得引数
   * @returns テーブル一覧取得結果
   */
  async execute(args: ListTablesArguments): Promise<ToolResponse> {
    try {
      const connectionConfig =
        this.appConfigProvider.getDefaultDatabaseConfig();
      const adapter = RdbmsAdapterFactory.create(connectionConfig);
      await adapter.init();

      const query = adapter.getListTablesQuery();
      const results = await adapter.all(query, []);

      await adapter.close();

      return {
        content: [
          {
            type: 'text',
            text: `Tables: ${JSON.stringify(results, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing tables: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

}
