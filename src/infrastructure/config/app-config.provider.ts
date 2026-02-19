import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DatabaseConnectionConfig } from '../../domain/rdbms/rdbms-connection.interface.js';
import type { NoSqlConnectionConfig } from '../../domain/nosql/nosql-connection.interface.js';
import { RdbmsAdapterFactory } from '../rdbms/adapters/rdbms-adapter-factory.js';
import { NoSqlAdapterFactory } from '../nosql/adapters/nosql-adapter-factory.js';

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

  /** 有効化するNoSQL MCPツールのリスト（未設定時は空配列 = 全ツール有効） */
  get enabledNoSqlTools(): string[] {
    const tools = this.configService.get<string>('ENABLED_NOSQL_TOOLS');
    return tools ? tools.split(',').map((t) => t.trim()) : [];
  }

  /** DB_TYPE を小文字正規化して取得 */
  get dbType(): string {
    return (this.configService.get<string>('DB_TYPE') ?? 'postgres')
      .trim()
      .toLowerCase();
  }

  /** NoSQL向けデータベース名（未設定時はadmin） */
  get noSqlDatabase(): string {
    return this.configService.get<string>('MONGO_DATABASE') ?? 'admin';
  }

  /** MongoDB接続URI（未設定時はSERVER/PORTまたはlocalhostから組み立て） */
  get mongoUri(): string {
    const configuredUri = this.configService.get<string>('MONGO_URI')?.trim();
    if (configuredUri && configuredUri.length > 0) {
      return configuredUri;
    }

    const server = this.configService.get<string>('SERVER') ?? 'localhost';
    const port = this.getOptionalNumber('PORT') ?? 27017;
    return `mongodb://${server}:${String(port)}`;
  }

  /** デフォルトのデータベース接続設定を取得 */
  getDefaultDatabaseConfig(): DatabaseConnectionConfig {
    const dbType = this.dbType;

    return RdbmsAdapterFactory.resolveConfig(dbType, {
      server: this.configService.get<string>('SERVER'),
      port: this.getOptionalNumber('PORT'),
      database: this.configService.get<string>('DATABASE'),
      user: this.configService.get<string>('USER'),
      password: this.configService.get<string>('PASSWORD'),
      ssl: this.getOptionalBoolean('DB_SSL'),
    });
  }

  /** デフォルトのNoSQL接続設定を取得 */
  getDefaultNoSqlConfig(): NoSqlConnectionConfig {
    return NoSqlAdapterFactory.resolveConfig(this.dbType, {
      uri: this.mongoUri,
      database: this.noSqlDatabase,
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

  /** 環境変数を真偽値として取得（未設定時はundefined） */
  private getOptionalBoolean(key: string): boolean | undefined {
    const value = this.configService.get<string>(key);
    if (value === undefined || value.trim() === '') {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();
    const truthyValues = ['true', '1', 'yes', 'on'];
    const falsyValues = ['false', '0', 'no', 'off'];

    if (truthyValues.includes(normalized)) {
      return true;
    }
    if (falsyValues.includes(normalized)) {
      return false;
    }

    throw new Error(
      `Invalid boolean value for ${key}: "${value}". Use true/false.`,
    );
  }
}
