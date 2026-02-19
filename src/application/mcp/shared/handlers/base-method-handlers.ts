import { Injectable, Logger } from '@nestjs/common';
import type {
  LoggingSetLevelParams,
  McpMessage,
  ToolsCallParams,
} from '../../../../domain/mcp/shared/mcp-message.interface.js';
import type { McpMethodHandler } from '../../../../domain/mcp/shared/method-handler.interface.js';
import type {
  McpBaseResponse,
  McpInitializeResponse,
  McpToolResult,
} from '../../../../domain/mcp/shared/mcp-response.interface.js';
import type {
  McpToolDefinition,
  McpToolWithDefinition,
} from '../../../../domain/mcp/shared/tool-definition.interface.js';

export interface InitializeHandlerConfig {
  serverName: string;
  serverVersion: string;
  initializeLogMessage: string;
}

export interface NotificationsInitializedHandlerConfig {
  initializedLogMessage: string;
}

export interface LoggingSetLevelHandlerConfig {
  logPrefix: string;
}

export interface ToolsCallHandlerConfig {
  loggerContext: string;
  executeLogPrefix: string;
  errorLogPrefix: string;
}

/**
 * initialize 共通ハンドラー
 */
@Injectable()
export class BaseInitializeHandler implements McpMethodHandler {
  readonly method = 'initialize';
  private readonly logger = new Logger(BaseInitializeHandler.name);

  constructor(private readonly config: InitializeHandlerConfig) {}

  handle(message: McpMessage): McpInitializeResponse {
    this.logger.log(this.config.initializeLogMessage);
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: false },
          logging: {
            levels: ['error', 'warn', 'info', 'debug'],
          },
        },
        serverInfo: {
          name: this.config.serverName,
          version: this.config.serverVersion,
        },
      },
    };
  }
}

/**
 * notifications/initialized 共通ハンドラー
 */
@Injectable()
export class BaseNotificationsInitializedHandler implements McpMethodHandler {
  readonly method = 'notifications/initialized';
  private readonly logger = new Logger(BaseNotificationsInitializedHandler.name);

  constructor(private readonly config: NotificationsInitializedHandlerConfig) {}

  handle(_message: McpMessage): void {
    this.logger.log(this.config.initializedLogMessage);
  }
}

/**
 * logging/setLevel 共通ハンドラー
 */
@Injectable()
export class BaseLoggingSetLevelHandler implements McpMethodHandler {
  readonly method = 'logging/setLevel';
  private readonly logger = new Logger(BaseLoggingSetLevelHandler.name);

  constructor(private readonly config: LoggingSetLevelHandlerConfig) {}

  handle(
    message: McpMessage<LoggingSetLevelParams>,
  ): McpBaseResponse<Record<string, never>> {
    this.logger.log(`${this.config.logPrefix}: ${message.params?.level ?? 'info'}`);
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: {},
    };
  }
}

/**
 * tools/list 共通ハンドラー
 */
@Injectable()
export class BaseToolsListHandler implements McpMethodHandler {
  readonly method = 'tools/list';

  constructor(private readonly tools: McpToolWithDefinition[]) {}

  handle(message: McpMessage): McpBaseResponse<{ tools: McpToolDefinition[] }> {
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        tools: this.tools.map((tool) => tool.getDefinition()),
      },
    };
  }
}

/**
 * tools/call 共通ハンドラー
 */
@Injectable()
export class BaseToolsCallHandler implements McpMethodHandler {
  readonly method = 'tools/call';
  private readonly logger: Logger;

  constructor(
    private readonly tools: McpToolWithDefinition[],
    private readonly config: ToolsCallHandlerConfig,
  ) {
    this.logger = new Logger(config.loggerContext);
  }

  async handle(
    message: McpMessage<ToolsCallParams>,
  ): Promise<McpBaseResponse<McpToolResult>> {
    const { name, arguments: args } = message.params ?? {};

    try {
      const tool = this.tools.find((candidate) => candidate.name === name);
      if (!tool) {
        const error = new Error(`Unknown tool: ${name}`);
        error.name = 'UnknownToolError';
        throw error;
      }

      this.logger.debug(
        `${this.config.executeLogPrefix}: ${name} with args: ${JSON.stringify(args)}`,
      );

      const result = await tool.execute(args as Record<string, unknown>);
      return {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        },
      };
    } catch (error) {
      this.logger.error(
        `${this.config.errorLogPrefix}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
