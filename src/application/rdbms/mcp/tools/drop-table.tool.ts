import { Injectable } from '@nestjs/common';
import { McpToolWithDefinition } from '../../../../domain/rdbms/mcp/tools/tool-definition.interface.js';
import { McpToolDefinition } from '../../../../domain/rdbms/mcp/tools/tool-definition.interface.js';
import { ToolResponse } from '../../../../domain/rdbms/mcp/tool-response.interface.js';
import { DatabaseAdapterFactory } from '../../../../infrastructure/rdbms/adapters/database-adapter-factory.js';
import { DropTableArguments } from '../../../../domain/rdbms/mcp/tools/database-tools.interface.js';

/**
 * データベーステーブル削除ツール
 */
@Injectable()
export class DropTableTool implements McpToolWithDefinition<
  DropTableArguments,
  ToolResponse
> {
  readonly name = 'drop_table';

  constructor() {}

  /**
   * ツールの定義情報を取得します
   * @returns ツール定義
   */
  getDefinition(): McpToolDefinition {
    return {
      name: 'drop_table',
      description: 'Remove a table from the database with safety confirmation',
      inputSchema: {
        type: 'object',
        properties: {
          table_name: {
            type: 'string',
            description: 'The name of the table to drop',
          },
          confirm: {
            type: 'boolean',
            description: 'Safety confirmation flag - must be true to proceed',
          },
        },
        required: ['table_name', 'confirm'],
      },
    };
  }

  /**
   * データベースからテーブルを安全に削除します
   * @param args テーブル削除引数
   * @returns テーブル削除結果
   */
  async execute(args: DropTableArguments): Promise<ToolResponse> {
    try {
      if (!args.confirm) {
        return {
          content: [
            {
              type: 'text',
              text: `Safety check failed: confirm must be set to true to drop table '${args.table_name}'`,
            },
          ],
        };
      }

      const adapter = DatabaseAdapterFactory.create(args.connectionConfig);
      await adapter.init();

      // sp_executesqlとQUOTENAMEを使ってDDL文を完全にパラメータ化
      const query = `
        DECLARE @tableName NVARCHAR(128) = ?;
        DECLARE @sql NVARCHAR(MAX) = N'DROP TABLE ' + QUOTENAME(@tableName);
        EXEC sp_executesql @sql;
      `;
      const result = await adapter.run(query, [args.table_name]);

      await adapter.close();

      return {
        content: [
          {
            type: 'text',
            text: `Table '${args.table_name}' dropped successfully. Changes: ${result.changes}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error dropping table: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
}
