import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DatabaseConnectionConfig } from '../../domain/database/database-connection.interface.js';
import { DatabaseAdapterFactory } from '../database/adapters/database-adapter-factory.js';

/**
 * アプリケーション設定プロバイダー
 */
@Injectable()
export class AppConfigProvider {
  constructor(private readonly configService: ConfigService) {}

  /** アプリケーションがリッスンするポート番号（デフォルト: 3000） */
  get port(): number {
    return this.configService.get<number>('APP_PORT', 3000);
  }

  /** CORSで許可されるオリジン一覧（デフォルト: http://localhost:3000） */
  get allowedOrigins(): string[] {
    const origins = this.configService.get<string>('ALLOWED_ORIGINS');
    return origins ? origins.split(',') : ['http://localhost:3000'];
  }
  /** 有効化するMCPツールのリスト（未設定時は空配列 = 全ツール有効） */
  get enabledTools(): string[] {
    const tools = this.configService.get<string>('ENABLED_TOOLS');
    return tools ? tools.split(',').map((t) => t.trim()) : [];
  }
  /** デフォルトのデータベース接続設定を取得 */
  getDefaultDatabaseConfig(): DatabaseConnectionConfig {
    const dbType = this.configService.get<string>('DB_TYPE', 'sqlserver');

    return DatabaseAdapterFactory.resolveConfig(dbType, {
      server: this.configService.get<string>('SERVER'),
      port: this.getOptionalNumber('PORT'),
      database: this.configService.get<string>('DATABASE'),
      user: this.configService.get<string>('USER'),
      password: this.configService.get<string>('PASSWORD'),
    });
  }

  /** 環境変数を数値として取得（未設定時はundefined） */
  private getOptionalNumber(key: string): number | undefined {
    const value = this.configService.get<string>(key);
    if (value === undefined || value === '') {
      return undefined;
    }
    return Number(value);
  }
}
