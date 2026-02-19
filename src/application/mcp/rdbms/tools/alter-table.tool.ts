import { Injectable } from '@nestjs/common';
import { McpToolWithDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import { McpToolDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import { ToolResponse } from '../../../../domain/mcp/shared/tool-response.interface.js';
import { RdbmsAdapterFactory } from '../../../../infrastructure/rdbms/adapters/rdbms-adapter-factory.js';
import { AlterTableArguments } from '../../../../domain/mcp/rdbms/rdbms-tools.interface.js';

/**
 * データベーステーブル変更ツール
 */
@Injectable()
export class AlterTableTool implements McpToolWithDefinition<
  AlterTableArguments,
  ToolResponse
> {
  readonly name = 'alter_table';

  constructor() {}

  /**
   * ツールの定義情報を取得します
   * @returns ツール定義
   */
  getDefinition(): McpToolDefinition {
    return {
      name: 'alter_table',
      description:
        'Modify existing table schema (add columns, rename tables, etc.)',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The SQL ALTER TABLE query to execute',
          },
        },
        required: ['query'],
      },
    };
  }

  /**
   * 既存テーブルのスキーマを変更します
   * @param args テーブル変更引数
   * @returns テーブル変更結果
   */
  async execute(args: AlterTableArguments): Promise<ToolResponse> {
    try {
      const adapter = RdbmsAdapterFactory.create(args.connectionConfig);
      await adapter.init();

      const result = await adapter.run(args.query, []);

      await adapter.close();

      return {
        content: [
          {
            type: 'text',
            text: `Table altered successfully. Changes: ${result.changes}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error altering table: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
}
