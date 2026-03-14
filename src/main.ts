import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AppStdioModule } from './app-stdio.module.js';
import { BaseMcpService } from './application/mcp/shared/base-mcp.service.js';
import { McpRuntimeResolverService } from './application/mcp/runtime-resolver.service.js';

/**
 * エントリーポイント
 * MCP_TRANSPORT=stdio の場合はstdioモード、未設定またはhttpの場合はHTTPモードで起動します
 */
const transport = (process.env.MCP_TRANSPORT ?? 'http').trim().toLowerCase();

if (transport === 'stdio') {
  bootstrapStdio().catch((error: unknown) => {
    process.stderr.write(
      `stdioサーバー起動エラー: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  });
} else {
  bootstrapHttp().catch((error: unknown) => {
    const logger = new Logger('Bootstrap');
    logger.error('HTTPサーバー起動エラー:', error);
    process.exit(1);
  });
}

/**
 * stdioモードのブートストラップ
 * HTTPサーバーを起動せず、stdin/stdoutでMCPプロトコルを処理します
 * ログ出力はstdioプロトコルを壊さないよう完全無効化します
 */
async function bootstrapStdio(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppStdioModule, {
    logger: false,
  });

  const resolverService = app.get(McpRuntimeResolverService);
  const runtime = resolverService.resolveRuntime();

  if (!(runtime instanceof BaseMcpService)) {
    process.stderr.write('このランタイムはstdioモードに対応していません\n');
    process.exit(1);
  }

  await runtime.connectStdio();
}

/**
 * HTTPモードのブートストラップ
 * NestJS Fastifyサーバーを起動し、CORS設定を適用します
 */
async function bootstrapHttp(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  const isDevelopment = process.env.NODE_ENV === 'development';

  // CORS設定 - VS CodeのMCP拡張からのアクセスを許可
  app.enableCors({
    origin: true, // すべてのオリジンを許可（開発環境用）
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  if (isDevelopment) {
    setupSwagger(app);
  }

  const port = process.env.APP_PORT || 3000;
  const host = process.env.HOST || '0.0.0.0'; // Azure App Service用に0.0.0.0を使用
  await app.listen(port, host);
  logger.log(`DataBase Remote MCP Server running on http://${host}:${port}`);
  if (isDevelopment) {
    logger.log(`Swagger UI available at http://localhost:${port}/swagger`);
  }
}

/**
 * 開発モード向けのSwaggerセットアップ（HTTPモードのみ）
 * Fastify環境でOpenAPI/Swagger UIを有効化する
 */
function setupSwagger(app: NestFastifyApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('DataBase Remote  MCP API')
    .setDescription('MCP HTTPエンドポイントの開発用ドキュメント')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, document);
}
