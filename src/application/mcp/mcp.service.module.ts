import { Module } from '@nestjs/common';
import { McpService } from './mcp.service.js';
import { McpRuntimeResolverService } from './runtime-resolver.service.js';
import { NoSqlRuntimeService } from './nosql/runtime.service.js';
import { RdbmsRuntimeService } from './rdbms/runtime.service.js';
import { ReadQueryTool } from './rdbms/tools/read-query.tool.js';
import { WriteQueryTool } from './rdbms/tools/write-query.tool.js';
import { ExportQueryTool } from './rdbms/tools/export-query.tool.js';
import { ListTablesTool } from './rdbms/tools/list-tables.tool.js';
import { DescribeTableTool } from './rdbms/tools/describe-table.tool.js';
import { GetSchemaTool } from './rdbms/tools/get-schema.tool.js';
import { CreateTableTool } from './rdbms/tools/create-table.tool.js';
import { AlterTableTool } from './rdbms/tools/alter-table.tool.js';
import { DropTableTool } from './rdbms/tools/drop-table.tool.js';
import { ListInsightsTool } from './rdbms/tools/list-insights.tool.js';
import { AppendInsightTool } from './rdbms/tools/append-insight.tool.js';
import { ListCollectionsTool } from './nosql/tools/list-collections.tool.js';
import { RdbmsAdapterFactory } from '../../infrastructure/rdbms/adapters/rdbms-adapter-factory.js';
import { AppConfigProvider } from '../../infrastructure/config/app-config.provider.js';

/**
 * データベースモジュール
 * データベース関連のサービスとツールを提供します
 */
@Module({
  providers: [
    McpService,
    McpRuntimeResolverService,
    RdbmsRuntimeService,
    NoSqlRuntimeService,
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
    ListCollectionsTool,
    RdbmsAdapterFactory,
    AppConfigProvider,
  ],
  exports: [McpService],
})
export class McpServiceModule {}
