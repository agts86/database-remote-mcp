/**
 * MongoDB接続設定
 */
export interface MongoConnectionConfig {
  type: 'mongodb';
  uri: string;
  database: string;
}

/**
 * NoSQL接続設定の統合型
 */
export type NoSqlConnectionConfig = MongoConnectionConfig;

