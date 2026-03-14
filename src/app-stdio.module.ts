import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { McpServiceModule } from './application/mcp/mcp.service.module.js';

/**
 * stdioモード用ルートモジュール
 * Presentation層（HTTP/Fastify）を除いた構成
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    McpServiceModule,
  ],
})
export class AppStdioModule {}
