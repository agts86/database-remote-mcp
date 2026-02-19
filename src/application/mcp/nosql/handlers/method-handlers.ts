import { Injectable } from '@nestjs/common';
import type { McpToolWithDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import {
  BaseInitializeHandler,
  BaseLoggingSetLevelHandler,
  BaseNotificationsInitializedHandler,
  BaseToolsListHandler,
} from '../../shared/handlers/base-method-handlers.js';

@Injectable()
export class NoSqlInitializeHandler extends BaseInitializeHandler {
  constructor() {
    super({
      serverName: 'database-remote-mcp-nosql',
      serverVersion: '0.1.0',
      initializeLogMessage: 'Handling HTTP MCP initialize request (NoSQL)',
    });
  }
}

@Injectable()
export class NoSqlNotificationsInitializedHandler extends BaseNotificationsInitializedHandler {
  constructor() {
    super({
      initializedLogMessage: 'HTTP MCP NoSQL client initialized',
    });
  }
}

@Injectable()
export class NoSqlLoggingSetLevelHandler extends BaseLoggingSetLevelHandler {
  constructor() {
    super({
      logPrefix: 'Setting NoSQL log level to',
    });
  }
}

@Injectable()
export class NoSqlToolsListHandler extends BaseToolsListHandler {
  constructor(tools: McpToolWithDefinition[]) {
    super(tools);
  }
}
