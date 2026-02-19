import { Injectable } from '@nestjs/common';
import type { McpToolDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import type { McpToolWithDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import type { ToolResponse } from '../../../../domain/mcp/shared/tool-response.interface.js';
import type { ListCollectionsArguments } from '../../../../domain/mcp/nosql/nosql-tools.interface.js';
import type { INoSqlAdapter } from '../../../../domain/nosql/nosql-adapter.interface.js';
import { AppConfigProvider } from '../../../../infrastructure/config/app-config.provider.js';
import { NoSqlAdapterFactory } from '../../../../infrastructure/nosql/adapters/nosql-adapter-factory.js';

/**
 * NoSQLコレクション一覧取得ツール
 */
@Injectable()
export class ListCollectionsTool implements McpToolWithDefinition<
  ListCollectionsArguments,
  ToolResponse
> {
  readonly name = 'list_collections';

  constructor(private readonly appConfigProvider: AppConfigProvider) {}

  getDefinition(): McpToolDefinition {
    return {
      name: this.name,
      description: 'List collections for the configured NoSQL database',
      inputSchema: {
        type: 'object',
        properties: {
          database: {
            type: 'string',
            description: 'Optional database name override',
          },
        },
      },
    };
  }

  execute(args: ListCollectionsArguments): Promise<ToolResponse> {
    return this.executeInternal(args);
  }

  private async executeInternal(
    args: ListCollectionsArguments,
  ): Promise<ToolResponse> {
    const database = this.normalizeDatabase(args.database);
    let adapter: INoSqlAdapter | null = null;

    try {
      const connectionConfig = this.appConfigProvider.getDefaultNoSqlConfig();
      adapter = NoSqlAdapterFactory.create(connectionConfig);
      await adapter.init();
      const collections = await adapter.listCollections(database);
      const targetDatabase = database ?? connectionConfig.database;

      return {
        content: [
          {
            type: 'text',
            text: `Collections in "${targetDatabase}": ${JSON.stringify(collections, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing collections: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    } finally {
      if (adapter) {
        try {
          await adapter.close();
        } catch {
          // クローズ失敗時はエラーを握り潰してレスポンスを優先
        }
      }
    }
  }

  private normalizeDatabase(database?: string): string | undefined {
    const normalized = database?.trim();
    if (normalized && normalized.length > 0) {
      return normalized;
    }
    return undefined;
  }
}
