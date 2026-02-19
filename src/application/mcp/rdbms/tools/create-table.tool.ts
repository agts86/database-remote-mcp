import { Injectable } from '@nestjs/common';
import { McpToolWithDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import { McpToolDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import { ToolResponse } from '../../../../domain/mcp/shared/tool-response.interface.js';
import { RdbmsAdapterFactory } from '../../../../infrastructure/rdbms/adapters/rdbms-adapter-factory.js';
import { CreateTableArguments } from '../../../../domain/mcp/rdbms/rdbms-tools.interface.js';

/**
 * データベーステーブル作成ツール
 */
@Injectable()
export class CreateTableTool implements McpToolWithDefinition<
  CreateTableArguments,
  ToolResponse
> {
  readonly name = 'create_table';

  constructor() {}

  /**
   * ツールの定義情報を取得します
   * @returns ツール定義
   */
  getDefinition(): McpToolDefinition {
    return {
      name: 'create_table',
      description: 'Create new tables in the database',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The SQL CREATE TABLE query to execute',
          },
        },
        required: ['query'],
      },
    };
  }

  /**
   * データベースに新しいテーブルを作成します
   * @param args テーブル作成引数
   * @returns テーブル作成結果
   */
  async execute(args: CreateTableArguments): Promise<ToolResponse> {
    try {
      const adapter = RdbmsAdapterFactory.create(args.connectionConfig);
      await adapter.init();

      const result = await adapter.run(args.query, []);

      await adapter.close();

      return {
        content: [
          {
            type: 'text',
            text: `Table created successfully. Changes: ${result.changes}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error creating table: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
}
