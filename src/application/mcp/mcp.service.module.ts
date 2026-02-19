import { Module } from '@nestjs/common';
import { McpService } from './mcp.service.js';
import { ReadQueryTool } from './tools/read-query.tool.js';
import { WriteQueryTool } from './tools/write-query.tool.js';
import { ExportQueryTool } from './tools/export-query.tool.js';
import { ListTablesTool } from './tools/list-tables.tool.js';
import { DescribeTableTool } from './tools/describe-table.tool.js';
import { GetSchemaTool } from './tools/get-schema.tool.js';
import { CreateTableTool } from './tools/create-table.tool.js';
import { AlterTableTool } from './tools/alter-table.tool.js';
import { DropTableTool } from './tools/drop-table.tool.js';
import { ListInsightsTool } from './tools/list-insights.tool.js';
import { AppendInsightTool } from './tools/append-insight.tool.js';
import { DatabaseAdapterFactory } from '../../infrastructure/database/adapters/database-adapter-factory.js';
import { AppConfigProvider } from '../../infrastructure/config/app-config.provider.js';

/**
 * データベースモジュール
 * データベース関連のサービスとツールを提供します
 */
@Module({
  providers: [
    McpService,
    ReadQueryTool,
    WriteQueryTool,
    ExportQueryTool,
    ListTablesTool,
    DescribeTableTool,
    GetSchemaTool,
    CreateTableTool,
    AlterTableTool,
    DropTableTool,
    ListInsightsTool,
    AppendInsightTool,
    DatabaseAdapterFactory,
    AppConfigProvider,
  ],
  exports: [McpService],
})
export class McpServiceModule {}
