import { Injectable } from '@nestjs/common';
import { McpToolWithDefinition } from '../../../domain/mcp/tools/tool-definition.interface.js';
import { McpToolDefinition } from '../../../domain/mcp/tools/tool-definition.interface.js';
import { ToolResponse } from '../../../domain/mcp/tool-response.interface.js';
import { DatabaseAdapterFactory } from '../../../infrastructure/database/adapters/database-adapter-factory.js';
import { AppConfigProvider } from '../../../infrastructure/config/app-config.provider.js';
import { QueryResultRow } from '../../../domain/database/database-adapter.interface.js';
import { ExportQueryArguments } from '../../../domain/mcp/tools/database-tools.interface.js';

/**
 * データベースエクスポートクエリツール
 */
@Injectable()
export class ExportQueryTool implements McpToolWithDefinition<
  ExportQueryArguments,
  ToolResponse
> {
  readonly name = 'export_query';

  constructor(private readonly appConfigProvider: AppConfigProvider) {}

  /**
   * ツールの定義情報を取得します
   * @returns ツール定義
   */
  getDefinition(): McpToolDefinition {
    return {
      name: 'export_query',
      description:
        'Execute a SELECT query and export results in CSV or JSON format',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The SQL SELECT query to execute for export',
          },
          format: {
            type: 'string',
            enum: ['csv', 'json'],
            description: 'Output format for the query results',
          },
        },
        required: ['query', 'format'],
      },
    };
  }

  /**
   * SELECTクエリを実行し、結果をCSVまたはJSON形式でエクスポートします
   * @param args エクスポートクエリ引数
   * @returns エクスポート結果
   */
  async execute(args: ExportQueryArguments): Promise<ToolResponse> {
    try {
      const connectionConfig =
        this.appConfigProvider.getDefaultDatabaseConfig();
      const adapter = DatabaseAdapterFactory.create(connectionConfig);
      await adapter.init();

      const results = await adapter.all(args.query, []);

      await adapter.close();

      const output = this.formatResults(results, args.format);

      return {
        content: [
          {
            type: 'text',
            text: `Export results (${args.format}):\n${output}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error exporting query: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  /**
   * クエリ結果を指定されたフォーマットで整形します
   * @param results クエリ結果の行配列
   * @param format 出力フォーマット（csvまたはjson）
   * @returns 整形された文字列
   */
  private formatResults(
    results: QueryResultRow[],
    format: 'csv' | 'json',
  ): string {
    if (format === 'csv') {
      return this.convertToCSV(results);
    }
    if (format === 'json') {
      return JSON.stringify(results, null, 2);
    }
    throw new Error(`Unsupported format: ${String(format)}`);
  }

  /**
   * クエリ結果をCSV形式に変換します
   * @param results クエリ結果の行配列
   * @returns CSV形式の文字列
   */
  private convertToCSV(results: QueryResultRow[]): string {
    if (!Array.isArray(results) || results.length === 0) {
      return '';
    }

    const headers = Object.keys(results[0] as Record<string, unknown>);
    const csvRows = [headers.join(',')];

    results.forEach((row) => {
      const values = headers.map((header) =>
        this.formatCellValue((row as Record<string, unknown>)[header]),
      );
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * セルの値をCSVフォーマット用に整形します
   * @param value セルの値
   * @returns 整形された文字列
   */
  private formatCellValue(value: unknown): string {
    if (value == null) return '';
    const formatters = new Map<string, (value: unknown) => string>([
      ['object', (value: unknown): string => JSON.stringify(value)],
      [
        'string',
        (value: unknown): string =>
          `"${(value as string).replace(/"/g, '""')}"`,
      ],
      ['number', (value: unknown): string => String(value)],
      ['boolean', (value: unknown): string => String(value)],
    ]);
    const formatter = formatters.get(typeof value);
    return formatter ? formatter(value) : '';
  }
}
