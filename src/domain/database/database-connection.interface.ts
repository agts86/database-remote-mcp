/**
 * データベース接続設定の基底インターフェース
 */
export interface BaseConnectionConfig {
  database: string;
  user?: string;
  password?: string;
  port?: number;
}

/**
 * SQL Server データベース接続設定
 */
export interface SqlServerConnectionConfig extends BaseConnectionConfig {
  type: 'sqlserver';
  server: string;
}

/**
 * PostgreSQL データベース接続設定
 */
export interface PostgresConnectionConfig extends BaseConnectionConfig {
  type: 'postgres';
  host: string;
  ssl?: boolean;
}

/**
 * MySQL データベース接続設定
 */
export interface MysqlConnectionConfig extends BaseConnectionConfig {
  type: 'mysql';
  host: string;
}

/**
 * データベース接続設定の統合型
 */
export type DatabaseConnectionConfig =
  | SqlServerConnectionConfig
  | PostgresConnectionConfig
  | MysqlConnectionConfig;

/**
 * データベースメタデータ
 */
export interface DatabaseMetadata {
  name: string;
  type: string;
  path?: string;
  server?: string;
  database?: string;
}
