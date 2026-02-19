import { Injectable } from '@nestjs/common';
import { McpToolWithDefinition } from '../../../domain/mcp/tools/tool-definition.interface.js';
import { McpToolDefinition } from '../../../domain/mcp/tools/tool-definition.interface.js';
import { ToolResponse } from '../../../domain/mcp/tool-response.interface.js';
import { DatabaseAdapterFactory } from '../../../infrastructure/database/adapters/database-adapter-factory.js';
import { AppConfigProvider } from '../../../infrastructure/config/app-config.provider.js';
import { DescribeTableArguments } from '../../../domain/mcp/tools/database-tools.interface.js';

/**
 * データベーステーブル説明ツール
 */
@Injectable()
export class DescribeTableTool implements McpToolWithDefinition<
  DescribeTableArguments,
  ToolResponse
> {
  readonly name = 'describe_table';

  constructor(private readonly configProvider: AppConfigProvider) {}

  /**
   * ツールの定義情報を取得します
   * @returns ツール定義
   */
  getDefinition(): McpToolDefinition {
    return {
      name: 'describe_table',
      description:
        'Get detailed information about a specific table including columns, types, and constraints',
      inputSchema: {
        type: 'object',
        properties: {
          table_name: {
            type: 'string',
            description: 'The name of the table to describe',
          },
        },
        required: ['table_name'],
      },
    };
  }

  /**
   * 指定したテーブルの詳細情報を取得します
   * @param args テーブル記述引数
   * @returns テーブル記述結果
   */
  async execute(args: DescribeTableArguments): Promise<ToolResponse> {
    try {
      const connectionConfig = this.configProvider.getDefaultDatabaseConfig();
      const adapter = DatabaseAdapterFactory.create(connectionConfig);
      await adapter.init();

      const query = this.getDescribeTableQuery(
        connectionConfig.type,
        args.table_name,
      );
      // パラメータとしてテーブル名を渡す（SQLインジェクション対策）
      const results = await adapter.all(query, [args.table_name]);

      await adapter.close();

      return {
        content: [
          {
            type: 'text',
            text: `Table structure for '${args.table_name}':\n${JSON.stringify(results, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error describing table '${args.table_name}': ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  /**
   * データベースタイプに応じたテーブル記述クエリを取得します
   * @param type データベースタイプ
   * @param tableName テーブル名
   * @returns テーブル記述クエリ
   */
  private getDescribeTableQuery(type: string, tableName: string): string {
    const queryStrategies = this.getQueryStrategies(tableName);
    const strategy = queryStrategies.find((s) => s.supports(type));

    if (!strategy) {
      throw new Error(`Unsupported database type: ${type}`);
    }

    return strategy.getQuery();
  }

  /**
   * テーブル名に基づいたデータベースタイプ別のクエリ戦略を取得します
   * @param tableName テーブル名
   * @returns クエリ戦略の配列
   */
  private getQueryStrategies(
    tableName: string,
  ): Array<{ supports: (type: string) => boolean; getQuery: () => string }> {
    return [
      {
        supports: (type: string) => type === 'sqlserver',
        // DECLARE + パラメータ化（DROP TABLEと同じアプローチ）
        getQuery: () => `
          DECLARE @tableName NVARCHAR(128) = ?;
          SELECT 
            c.COLUMN_NAME as name,
            c.DATA_TYPE as type,
            CASE WHEN c.IS_NULLABLE = 'YES' THEN 0 ELSE 1 END as notnull,
            CASE WHEN tc.CONSTRAINT_TYPE = 'PRIMARY KEY' THEN 1 ELSE 0 END as pk,
            c.COLUMN_DEFAULT as dflt_value
          FROM 
            INFORMATION_SCHEMA.COLUMNS c
          LEFT JOIN 
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu ON c.TABLE_NAME = kcu.TABLE_NAME AND c.COLUMN_NAME = kcu.COLUMN_NAME
          LEFT JOIN 
            INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
          WHERE 
            c.TABLE_NAME = @tableName
          ORDER BY 
            c.ORDINAL_POSITION
        `,
      },
    ];
  }
}
