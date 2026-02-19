import { Injectable } from '@nestjs/common';
import type { McpToolWithDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import {
  BaseInitializeHandler,
  BaseLoggingSetLevelHandler,
  BaseNotificationsInitializedHandler,
  BaseToolsListHandler,
} from '../../shared/handlers/base-method-handlers.js';

@Injectable()
export class RdbmsInitializeHandler extends BaseInitializeHandler {
  constructor() {
    super({
      serverName: 'database-remote-mcp',
      serverVersion: '0.1.0',
      initializeLogMessage: 'Handling HTTP MCP initialize request',
    });
  }
}

@Injectable()
export class RdbmsNotificationsInitializedHandler extends BaseNotificationsInitializedHandler {
  constructor() {
    super({
      initializedLogMessage: 'HTTP MCP client initialized',
    });
  }
}

@Injectable()
export class RdbmsLoggingSetLevelHandler extends BaseLoggingSetLevelHandler {
  constructor() {
    super({
      logPrefix: 'Setting log level to',
    });
  }
}

@Injectable()
export class RdbmsToolsListHandler extends BaseToolsListHandler {
  constructor(tools: McpToolWithDefinition[]) {
    super(tools);
  }
}
