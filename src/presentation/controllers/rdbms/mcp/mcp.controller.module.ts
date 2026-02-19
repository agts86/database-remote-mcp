import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller.js';
import { McpServiceModule } from '../../../../application/rdbms/mcp/mcp.service.module.js';
import { AppConfigProvider } from '../../../../infrastructure/config/app-config.provider.js';
import { SSEInterceptor } from '../../../interceptors/sse.interceptor.js';

/**
 * mcpコントローラモジュール
 * データベースツールのHTTP APIコントローラーを提供します
 */
@Module({
  imports: [McpServiceModule],
  controllers: [McpController],
  providers: [AppConfigProvider, SSEInterceptor],
})
export class McpModule {}
