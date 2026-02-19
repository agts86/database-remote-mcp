/**
 * NoSQLアダプターの共通インターフェース
 */
export interface INoSqlAdapter {
  /**
   * 接続を初期化
   */
  init(): Promise<void>;

  /**
   * コレクション一覧を取得
   * @param database データベース名（未指定時は既定値）
   */
  listCollections(database?: string): Promise<string[]>;

  /**
   * 接続を閉じる
   */
  close(): Promise<void>;

  /**
   * アダプターのメタデータを取得
   */
  getMetadata(): { type: string; database: string; [key: string]: unknown };
}

