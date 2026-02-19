import { Injectable } from '@nestjs/common';
import { McpToolWithDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import { McpToolDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import { ToolResponse } from '../../../../domain/mcp/shared/tool-response.interface.js';
import { RdbmsAdapterFactory } from '../../../../infrastructure/rdbms/adapters/rdbms-adapter-factory.js';
import { AppConfigProvider } from '../../../../infrastructure/config/app-config.provider.js';
import { DescribeTableArguments } from '../../../../domain/mcp/rdbms/rdbms-tools.interface.js';

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
      const adapter = RdbmsAdapterFactory.create(connectionConfig);
      await adapter.init();

      const query = adapter.getDescribeTableQuery(args.table_name);
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

}
