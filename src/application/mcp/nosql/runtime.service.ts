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
  NoSqlInitializeHandler,
  NoSqlLoggingSetLevelHandler,
  NoSqlNotificationsInitializedHandler,
  NoSqlToolsListHandler,
} from './handlers/method-handlers.js';
import { NoSqlToolsCallHandler } from './handlers/nosql-tools-call.handler.js';
import { ListCollectionsTool } from './tools/list-collections.tool.js';

const NOSQL_SCHEMAS = {
  list_collections: z.object({
    database: z.string().optional(),
  }),
};

const NOSQL_SERVER_CONFIG: BaseMcpRuntimeServerConfig = {
  info: {
    name: 'database-remote-mcp-nosql',
    version: '0.1.0',
    description: 'DataBase Remote NoSQL MCP Server - HTTP API',
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
  streamableName: 'database-remote-mcp-nosql',
  streamableVersion: '0.1.0',
};

const NOSQL_LOG_CONFIG: BaseMcpRuntimeLogConfig = {
  httpProcessPrefix: 'Processing HTTP NoSQL MCP message',
  httpErrorPrefix: 'HTTP NoSQL MCP Message handling error',
  sseRequested: 'NoSQL SSE connection requested',
  sseClosed: 'NoSQL SSE connection closed',
  streamableErrorPrefix: 'NoSQL Streamable HTTP handling error',
};

/**
 * NoSQL向けMCPランタイム
 */
@Injectable()
export class NoSqlRuntimeService extends BaseMcpService {
  constructor(
    appConfigProvider: AppConfigProvider,
    listCollectionsTool: ListCollectionsTool,
  ) {
    const tools: McpToolWithDefinition[] = [listCollectionsTool];

    super(
      {
        loggerContext: NoSqlRuntimeService.name,
        tools,
        allSchemas: NOSQL_SCHEMAS,
        server: NOSQL_SERVER_CONFIG,
        logs: NOSQL_LOG_CONFIG,
        toolFilter: {
          enabledTools: appConfigProvider.enabledNoSqlTools,
          envName: 'ENABLED_NOSQL_TOOLS',
          scopeLabel: 'NoSQL ',
        },
      },
      (enabledTools: McpToolWithDefinition[]): McpMethodHandler[] => [
        new NoSqlInitializeHandler(),
        new NoSqlNotificationsInitializedHandler(),
        new NoSqlLoggingSetLevelHandler(),
        new NoSqlToolsListHandler(enabledTools),
        new NoSqlToolsCallHandler(enabledTools),
      ],
    );
  }
}
