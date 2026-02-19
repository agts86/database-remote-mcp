import { Injectable } from '@nestjs/common';
import { McpToolWithDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import { McpToolDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import { ToolResponse } from '../../../../domain/mcp/shared/tool-response.interface.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ListInsightsArguments } from '../../../../domain/mcp/rdbms/rdbms-tools.interface.js';

/**
 * ビジネスインサイト一覧ツール
 */
@Injectable()
export class ListInsightsTool implements McpToolWithDefinition<
  ListInsightsArguments,
  ToolResponse
> {
  readonly name = 'list_insights';
  private readonly insightFile = join(process.cwd(), 'insights.txt');

  private createTextResponse(text: string): ToolResponse {
    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  private async readInsightsFileContent(): Promise<string | null> {
    try {
      return await fs.readFile(this.insightFile, 'utf-8');
    } catch (fileError: unknown) {
      if (
        fileError &&
        typeof fileError === 'object' &&
        'code' in fileError &&
        (fileError as { code: string }).code === 'ENOENT'
      ) {
        return null;
      }

      throw fileError;
    }
  }

  /**
   * ツールの定義情報を取得します
   * @returns ツール定義
   */
  getDefinition(): McpToolDefinition {
    return {
      name: 'list_insights',
      description: 'List all business insights in the memo',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };
  }

  /**
   * メモに保存されたビジネスインサイトの一覧を取得します
   * @param args インサイト一覧取得引数
   * @returns インサイト一覧取得結果
   */
  async execute(args: ListInsightsArguments): Promise<ToolResponse> {
    try {
      const content = await this.readInsightsFileContent();

      if (content === null) {
        return this.createTextResponse(
          'No insights file found. Add insights using the append_insight tool.',
        );
      }

      if (!content.trim()) {
        return this.createTextResponse('No insights found in the memo.');
      }

      return this.createTextResponse(`Business Insights:\n\n${content}`);
    } catch (error) {
      return this.createTextResponse(
        `Error reading insights: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
