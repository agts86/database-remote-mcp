import { Injectable } from '@nestjs/common';
import type { McpToolWithDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import { BaseToolsCallHandler } from '../../shared/handlers/base-method-handlers.js';

@Injectable()
export class NoSqlToolsCallHandler extends BaseToolsCallHandler {
  constructor(tools: McpToolWithDefinition[]) {
    super(tools, {
      loggerContext: NoSqlToolsCallHandler.name,
      executeLogPrefix: 'Executing NoSQL tool',
      errorLogPrefix: 'NoSQL tool execution error',
    });
  }
}
