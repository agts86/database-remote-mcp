import type { IDatabaseAdapter } from '../../../domain/database/database-adapter.interface.js';
import type { DatabaseConnectionConfig } from '../../../domain/database/database-connection.interface.js';
import { SqlServerAdapter } from './sqlserver-adapter.js';
import { PostgresAdapter } from './postgres-adapter.js';
import { MysqlAdapter } from './mysql-adapter.js';
/** 環境変数から読み取った生の接続情報 */
export interface RawDatabaseEnv {
  server?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
}

interface IAdapterCreationStrategy {
  readonly type: string;
  createAdapter(config: DatabaseConnectionConfig): IDatabaseAdapter;
  getDefaultConfig(env: RawDatabaseEnv): DatabaseConnectionConfig;
}

/**
 * SQL Server用のアダプター作成戦略
 */
class SqlServerCreationStrategy implements IAdapterCreationStrategy {
  readonly type = 'sqlserver';

  createAdapter(config: DatabaseConnectionConfig): IDatabaseAdapter {
    if (config.type !== 'sqlserver') {
      throw new Error(
        `Invalid config type for SqlServerAdapter: ${String(config.type)}`,
      );
    }
    return new SqlServerAdapter(config);
  }

  getDefaultConfig(env: RawDatabaseEnv): DatabaseConnectionConfig {
    return {
      type: 'sqlserver',
      server: env.server ?? 'localhost',
      port: env.port ?? 1433,
      database: env.database ?? 'master',
      user: env.user ?? 'sa',
      password: env.password ?? '',
    };
  }
}

/**
 * PostgreSQL用のアダプター作成戦略
 */
class PostgresCreationStrategy implements IAdapterCreationStrategy {
  readonly type = 'postgres';

  createAdapter(config: DatabaseConnectionConfig): IDatabaseAdapter {
    if (config.type !== 'postgres') {
      throw new Error(
        `Invalid config type for PostgresAdapter: ${String(config.type)}`,
      );
    }
    return new PostgresAdapter(config);
  }

  getDefaultConfig(env: RawDatabaseEnv): DatabaseConnectionConfig {
    const config: DatabaseConnectionConfig = {
      type: 'postgres',
      host: env.server ?? 'localhost',
      port: env.port ?? 5432,
      database: env.database ?? 'postgres',
      user: env.user ?? 'postgres',
      password: env.password ?? '',
    };
    if (env.ssl !== undefined) {
      return {
        ...config,
        ssl: env.ssl,
      };
    }
    return config;
  }
}

/**
 * MySQL用のアダプター作成戦略
 */
class MysqlCreationStrategy implements IAdapterCreationStrategy {
  readonly type = 'mysql';

  createAdapter(config: DatabaseConnectionConfig): IDatabaseAdapter {
    if (config.type !== 'mysql') {
      throw new Error(
        `Invalid config type for MysqlAdapter: ${String(config.type)}`,
      );
    }
    return new MysqlAdapter(config);
  }

  getDefaultConfig(env: RawDatabaseEnv): DatabaseConnectionConfig {
    return {
      type: 'mysql',
      host: env.server ?? 'localhost',
      port: env.port ?? 3306,
      database: env.database ?? 'mysql',
      user: env.user ?? 'root',
      password: env.password ?? '',
    };
  }
}

/**
 * データベースアダプターファクトリー
 * ストラテジーパターンを使用してアダプターを作成・設定解決します
 */
export class DatabaseAdapterFactory {
  private static readonly strategies: IAdapterCreationStrategy[] = [
    new SqlServerCreationStrategy(),
    new PostgresCreationStrategy(),
    new MysqlCreationStrategy(),
  ];

  /**
   * 設定に基づいてデータベースアダプターを作成します
   * @param config データベース接続設定
   * @returns 作成されたデータベースアダプター
   */
  static create(config: DatabaseConnectionConfig): IDatabaseAdapter {
    const strategy = this.strategies.find((s) => s.type === config.type);

    if (!strategy) {
      throw new Error(`Unsupported database type: ${config.type}`);
    }

    return strategy.createAdapter(config);
  }

  /**
   * DB種別と環境変数からデフォルト値を適用した接続設定を解決します
   * @param dbType データベース種別
   * @param env 環境変数から読み取った生の値
   * @returns 解決済みの接続設定
   */
  static resolveConfig(
    dbType: string,
    env: RawDatabaseEnv,
  ): DatabaseConnectionConfig {
    const strategy = this.strategies.find((s) => s.type === dbType);

    if (!strategy) {
      throw new Error(`Unsupported database type: ${dbType}`);
    }

    return strategy.getDefaultConfig(env);
  }
}
