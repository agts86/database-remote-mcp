/**
 * データベースクエリのタイプ
 */
export enum QueryType {
  READ = 'read',
  WRITE = 'write',
  SCHEMA = 'schema',
  EXPORT = 'export',
}

/**
 * データベースクエリのパラメータ
 */
export interface DatabaseQueryParams {
  query: string;
  type: QueryType;
  format?: 'json' | 'csv';
  params?: unknown[];
}

/**
 * データベースクエリの結果
 */
export interface DatabaseQueryResult {
  data?: unknown;
  affected_rows?: number;
  format?: 'json' | 'csv';
  isError: boolean;
  message?: string;
}

/**
 * テーブル情報
 */
export interface TableInfo {
  name: string;
  type: string;
  schema?: string;
}

/**
 * カラム情報
 */
export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey?: boolean;
}

/**
 * データベーススキーマ情報
 */
export interface SchemaInfo {
  tables: TableInfo[];
  views?: TableInfo[];
  indexes?: Array<{
    name: string;
    table: string;
    columns: string[];
    unique: boolean;
  }>;
}

/**
 * データベース操作サービスのインターフェース
 */
export interface IMcpService {
  /**
   * データベース接続を初期化
   */
  initializeConnection(config: unknown): Promise<void>;

  /**
   * クエリを実行
   */
  executeQuery(params: DatabaseQueryParams): Promise<DatabaseQueryResult>;

  /**
   * データベースのスキーマ情報を取得
   */
  getSchema(): Promise<SchemaInfo>;

  /**
   * テーブルの詳細情報を取得
   */
  getTableInfo(tableName: string): Promise<{
    columns: ColumnInfo[];
    indexes: Array<{ name: string; columns: string[] }>;
  }>;

  /**
   * データベース接続を閉じる
   */
  closeConnection(): Promise<void>;
}
