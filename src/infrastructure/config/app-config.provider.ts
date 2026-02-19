import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
  getDefaultDatabaseConfig(): {
    type: 'sqlserver';
    server: string;
    port: number;
    database: string;
    user: string;
    password: string;
  } {
    return {
      type: 'sqlserver' as const,
      server: this.configService.get<string>('SERVER', 'localhost//OBPM'),
      port: Number(this.configService.get('PORT', 1433)),
      database: this.configService.get<string>('DATABASE', 'OBPMDATA'),
      user: this.configService.get<string>('USER', 'sa'),
      password: this.configService.get<string>('PASSWORD', ''),
    };
  }
}
