import { Injectable } from '@nestjs/common';
import { McpToolWithDefinition } from '../../../domain/mcp/tools/tool-definition.interface.js';
import { McpToolDefinition } from '../../../domain/mcp/tools/tool-definition.interface.js';
import { ToolResponse } from '../../../domain/mcp/tool-response.interface.js';
import { DatabaseAdapterFactory } from '../../../infrastructure/database/adapters/database-adapter-factory.js';
import { AppConfigProvider } from '../../../infrastructure/config/app-config.provider.js';
import { ListTablesArguments } from '../../../domain/mcp/tools/database-tools.interface.js';

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
      const adapter = DatabaseAdapterFactory.create(connectionConfig);
      await adapter.init();

      const query = this.getListTablesQuery(connectionConfig.type);
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

  /**
   * データベースタイプに応じたテーブル一覧取得クエリを取得します
   * @param type データベースタイプ
   * @returns テーブル一覧取得クエリ
   */
  private getListTablesQuery(type: string): string {
    const queryStrategies = this.getQueryStrategies();
    const strategy = queryStrategies.find((s) => s.supports(type));

    if (!strategy) {
      throw new Error(`Unsupported database type: ${type}`);
    }

    return strategy.getQuery();
  }

  /**
   * データベースタイプ別のクエリ戦略を取得します
   * @returns クエリ戦略の配列
   */
  private getQueryStrategies(): Array<{
    supports: (type: string) => boolean;
    getQuery: () => string;
  }> {
    return [
      {
        supports: (type: string) => type === 'sqlserver',
        getQuery: () =>
          "SELECT table_name FROM information_schema.tables WHERE table_type='BASE TABLE';",
      },
    ];
  }
}
