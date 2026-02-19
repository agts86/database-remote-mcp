import { Injectable } from '@nestjs/common';
import { McpToolWithDefinition } from '../../../domain/mcp/tools/tool-definition.interface.js';
import { McpToolDefinition } from '../../../domain/mcp/tools/tool-definition.interface.js';
import { ToolResponse } from '../../../domain/mcp/tool-response.interface.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { AppendInsightArguments } from '../../../domain/mcp/tools/database-tools.interface.js';

/**
 * ビジネスインサイト追加ツール
 */
@Injectable()
export class AppendInsightTool implements McpToolWithDefinition<
  AppendInsightArguments,
  ToolResponse
> {
  readonly name = 'append_insight';
  private readonly insightFile = join(process.cwd(), 'insights.txt');

  /**
   * ツールの定義情報を取得します
   * @returns ツール定義
   */
  getDefinition(): McpToolDefinition {
    return {
      name: 'append_insight',
      description: 'Add a business insight to the memo',
      inputSchema: {
        type: 'object',
        properties: {
          insight: {
            type: 'string',
            description: 'The business insight to add to the memo',
          },
        },
        required: ['insight'],
      },
    };
  }

  /**
   * ビジネスインサイトをメモに追加します
   * @param args インサイト追加引数
   * @returns インサイト追加結果
   */
  async execute(args: AppendInsightArguments): Promise<ToolResponse> {
    try {
      const timestamp = new Date().toISOString();
      const insightEntry = `[${timestamp}] ${args.insight}\n`;

      await fs.appendFile(this.insightFile, insightEntry);

      return {
        content: [
          {
            type: 'text',
            text: `Insight added successfully to ${this.insightFile}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error appending insight: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
}
