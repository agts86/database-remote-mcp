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
 * データベース接続設定の統合型
 */
export type DatabaseConnectionConfig = SqlServerConnectionConfig;

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
