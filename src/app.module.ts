import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { McpModule } from './presentation/controllers/mcp/mcp.controller.module.js';

/**
 * アプリケーションのルートモジュール
 * 全てのモジュールを統合し、NestJSアプリケーションの構成を定義します
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    McpModule,
  ],
})
export class AppModule {}
