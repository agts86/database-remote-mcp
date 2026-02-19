/**
 * データベースクエリの結果行
 */
export interface QueryResultRow {
  [key: string]: unknown;
}

/**
 * データベース実行結果
 */
export interface DatabaseExecutionResult {
  changes: number;
  lastID: number;
}

/**
 * データベースアダプターインターフェース
 */
export interface IDatabaseAdapter {
  /**
   * データベース接続を初期化
   */
  init(): Promise<void>;

  /**
   * SELECT クエリを実行して全ての結果を取得
   * @param query SQLクエリ
   * @param params クエリパラメータ
   */
  all(query: string, params?: unknown[]): Promise<QueryResultRow[]>;

  /**
   * INSERT, UPDATE, DELETE クエリを実行
   * @param query SQLクエリ
   * @param params クエリパラメータ
   */
  run(query: string, params?: unknown[]): Promise<DatabaseExecutionResult>;

  /**
   * 複数のSQLステートメントを実行
   * @param query SQLステートメント
   */
  exec(query: string): Promise<void>;

  /**
   * データベース接続を閉じる
   */
  close(): Promise<void>;

  /**
   * データベース メタデータを取得
   */
  getMetadata(): { name: string; type: string; [key: string]: unknown };
}
