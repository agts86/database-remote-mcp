import type { DatabaseConnectionConfig } from '../../database/database-connection.interface.js';

/**
 * データベース読み取りクエリツールの引数
 */
export interface ReadQueryArguments {
  query: string;
}

/**
 * データベース書き込みクエリツールの引数
 */
export interface WriteQueryArguments {
  query: string;
}

/**
 * データベースエクスポートクエリツールの引数
 */
export interface ExportQueryArguments {
  query: string;
  format: 'csv' | 'json';
}

/**
 * データベーススキーマ取得ツールの引数
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetSchemaArguments {
  // 引数なし
}

/**
 * テーブル説明ツールの引数
 */
export interface DescribeTableArguments {
  table_name: string;
}

/**
 * データベーステーブル一覧ツールの引数
 */
export interface ListTablesArguments {
  database?: string;
  schema?: string;
}

/**
 * テーブル作成ツールの引数
 */
export interface CreateTableArguments {
  connectionConfig: DatabaseConnectionConfig;
  query: string;
}

/**
 * テーブル変更ツールの引数
 */
export interface AlterTableArguments {
  connectionConfig: DatabaseConnectionConfig;
  query: string;
}

/**
 * テーブル削除ツールの引数
 */
export interface DropTableArguments {
  connectionConfig: DatabaseConnectionConfig;
  table_name: string;
  confirm: boolean;
}

/**
 * インサイト追加ツールの引数
 */
export interface AppendInsightArguments {
  insight: string;
}

/**
 * インサイト一覧ツールの引数
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ListInsightsArguments {
  // 引数なし
}
