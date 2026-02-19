import { Injectable } from '@nestjs/common';
import type { McpToolWithDefinition } from '../../../../domain/mcp/shared/tool-definition.interface.js';
import { BaseToolsCallHandler } from '../../shared/handlers/base-method-handlers.js';

@Injectable()
export class RdbmsToolsCallHandler extends BaseToolsCallHandler {
  constructor(tools: McpToolWithDefinition[]) {
    super(tools, {
      loggerContext: RdbmsToolsCallHandler.name,
      executeLogPrefix: 'Executing RDBMS tool',
      errorLogPrefix: 'RDBMS tool execution error',
    });
  }
}
