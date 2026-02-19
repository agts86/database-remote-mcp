import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { McpMethodHandler } from '../../../domain/mcp/shared/method-handler.interface.js';
import type { McpToolWithDefinition } from '../../../domain/mcp/shared/tool-definition.interface.js';
import { AppConfigProvider } from '../../../infrastructure/config/app-config.provider.js';
import {
  BaseMcpService,
  type BaseMcpRuntimeLogConfig,
  type BaseMcpRuntimeServerConfig,
} from '../shared/base-mcp.service.js';
import {
  RdbmsInitializeHandler,
  RdbmsLoggingSetLevelHandler,
  RdbmsNotificationsInitializedHandler,
  RdbmsToolsListHandler,
} from './handlers/method-handlers.js';
import { RdbmsToolsCallHandler } from './handlers/rdbms-tools-call.handler.js';
import { AlterTableTool } from './tools/alter-table.tool.js';
import { AppendInsightTool } from './tools/append-insight.tool.js';
import { CreateTableTool } from './tools/create-table.tool.js';
import { DescribeTableTool } from './tools/describe-table.tool.js';
import { DropTableTool } from './tools/drop-table.tool.js';
import { ExportQueryTool } from './tools/export-query.tool.js';
import { GetSchemaTool } from './tools/get-schema.tool.js';
import { ListInsightsTool } from './tools/list-insights.tool.js';
import { ListTablesTool } from './tools/list-tables.tool.js';
import { ReadQueryTool } from './tools/read-query.tool.js';
import { WriteQueryTool } from './tools/write-query.tool.js';

const RDBMS_SCHEMAS = {
  read_query: z.object({ query: z.string() }),
  write_query: z.object({ query: z.string() }),
  export_query: z.object({
    query: z.string(),
    format: z.enum(['csv', 'json']),
  }),
  list_tables: z.object({}),
  describe_table: z.object({ table_name: z.string() }),
  get_schema: z.object({}),
  create_table: z.object({ query: z.string() }),
  alter_table: z.object({ query: z.string() }),
  drop_table: z.object({ table_name: z.string(), confirm: z.boolean() }),
  list_insights: z.object({}),
  append_insight: z.object({ insight: z.string() }),
};

const RDBMS_SERVER_CONFIG: BaseMcpRuntimeServerConfig = {
  info: {
    name: 'database-remote-mcp',
    version: '0.1.0',
    description: 'DataBase Remote RDBMS MCP Server - HTTP API',
    capabilities: {
      tools: true,
      resources: false,
      prompts: false,
    },
    endpoints: {
      tools: '/mcp/tools',
      listTools: '/mcp/tools',
      invokeTool: '/mcp/tools/{toolName}',
    },
  },
  streamableName: 'database-remote-mcp',
  streamableVersion: '0.1.0',
};

const RDBMS_LOG_CONFIG: BaseMcpRuntimeLogConfig = {
  httpProcessPrefix: 'Processing HTTP MCP message',
  httpErrorPrefix: 'HTTP MCP Message handling error',
  sseRequested: 'SSE connection requested',
  sseClosed: 'SSE connection closed',
  streamableErrorPrefix: 'Streamable HTTP handling error',
};

/**
 * RDBMS向けMCPランタイム
 */
@Injectable()
export class RdbmsRuntimeService extends BaseMcpService {
  constructor(
    appConfigProvider: AppConfigProvider,
    readQueryTool: ReadQueryTool,
    writeQueryTool: WriteQueryTool,
    exportQueryTool: ExportQueryTool,
    listTablesTool: ListTablesTool,
    describeTableTool: DescribeTableTool,
    getSchemaTool: GetSchemaTool,
    createTableTool: CreateTableTool,
    alterTableTool: AlterTableTool,
    dropTableTool: DropTableTool,
    listInsightsTool: ListInsightsTool,
    appendInsightTool: AppendInsightTool,
  ) {
    const tools: McpToolWithDefinition[] = [
      readQueryTool,
      writeQueryTool,
      exportQueryTool,
      listTablesTool,
      describeTableTool,
      getSchemaTool,
      createTableTool,
      alterTableTool,
      dropTableTool,
      listInsightsTool,
      appendInsightTool,
    ];

    super(
      {
        loggerContext: RdbmsRuntimeService.name,
        tools,
        allSchemas: RDBMS_SCHEMAS,
        server: RDBMS_SERVER_CONFIG,
        logs: RDBMS_LOG_CONFIG,
        toolFilter: {
          enabledTools: appConfigProvider.enabledTools,
          envName: 'ENABLED_TOOLS',
          scopeLabel: '',
        },
      },
      (enabledTools: McpToolWithDefinition[]): McpMethodHandler[] => [
        new RdbmsInitializeHandler(),
        new RdbmsNotificationsInitializedHandler(),
        new RdbmsLoggingSetLevelHandler(),
        new RdbmsToolsListHandler(enabledTools),
        new RdbmsToolsCallHandler(enabledTools),
      ],
    );
  }
}
