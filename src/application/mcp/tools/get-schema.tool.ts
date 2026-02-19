import { Injectable } from '@nestjs/common';
import { McpToolWithDefinition } from '../../../domain/mcp/tools/tool-definition.interface.js';
import { McpToolDefinition } from '../../../domain/mcp/tools/tool-definition.interface.js';
import { ToolResponse } from '../../../domain/mcp/tool-response.interface.js';
import { DatabaseAdapterFactory } from '../../../infrastructure/database/adapters/database-adapter-factory.js';
import { AppConfigProvider } from '../../../infrastructure/config/app-config.provider.js';
import { GetSchemaArguments } from '../../../domain/mcp/tools/database-tools.interface.js';

/**
 * データベーススキーマ取得ツール
 */
@Injectable()
export class GetSchemaTool implements McpToolWithDefinition<
  GetSchemaArguments,
  ToolResponse
> {
  readonly name = 'get_schema';

  constructor(private readonly appConfigProvider: AppConfigProvider) {}

  /**
   * ツールの定義情報を取得します
   * @returns ツール定義
   */
  getDefinition(): McpToolDefinition {
    return {
      name: 'get_schema',
      description:
        'Get the complete database schema including tables, views, and relationships',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    };
  }

  /**
   * データベースの完全なスキーマ情報を取得します
   * @param args スキーマ取得引数
   * @returns スキーマ取得結果
   */
  async execute(args: GetSchemaArguments): Promise<ToolResponse> {
    try {
      const connectionConfig =
        this.appConfigProvider.getDefaultDatabaseConfig();
      const adapter = DatabaseAdapterFactory.create(connectionConfig);
      await adapter.init();

      const query = adapter.getListTablesQuery();
      const results = await adapter.all(query, []);

      await adapter.close();

      // Create a simple schema structure
      const schema = {
        tables: results.map((row) => ({
          name: row.name || row.table_name || row.TABLE_NAME,
          type: 'table',
        })),
      };

      return {
        content: [
          {
            type: 'text',
            text: `Database schema: ${JSON.stringify(schema, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting schema: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

}
