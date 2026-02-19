import mysql from 'mysql2/promise';
import type {
  IDatabaseAdapter,
  QueryResultRow,
  DatabaseExecutionResult,
} from '../../../domain/database/database-adapter.interface.js';
import type { MysqlConnectionConfig } from '../../../domain/database/database-connection.interface.js';

/**
 * MySQL データベースアダプター実装
 */
export class MysqlAdapter implements IDatabaseAdapter {
  private pool: mysql.Pool | null = null;
  private readonly host: string;
  private readonly database: string;
  private readonly poolConfig: mysql.PoolOptions;

  /**
   * MySQLアダプターのインスタンスを作成します
   * @param connectionConfig MySQL接続設定
   */
  constructor(connectionConfig: MysqlConnectionConfig) {
    this.host = connectionConfig.host;
    this.database = connectionConfig.database;

    this.poolConfig = {
      host: connectionConfig.host,
      database: connectionConfig.database,
      port: connectionConfig.port || 3306,
      user: connectionConfig.user,
      password: connectionConfig.password,
      ...(connectionConfig.ssl
        ? { ssl: { rejectUnauthorized: false } }
        : {}),
    };
  }

  /**
   * データベース接続を初期化します
   * @throws {Error} 接続に失敗した場合
   */
  async init(): Promise<void> {
    try {
      this.pool = mysql.createPool(this.poolConfig);
      // 接続テスト
      const connection = await this.pool.getConnection();
      connection.release();
    } catch (error) {
      throw new Error(
        `Failed to connect to MySQL: ${(error as Error).message}`,
      );
    }
  }

  /**
   * SELECTクエリを実行し、全ての結果行を取得します
   * @param query 実行するSQLクエリ
   * @param params クエリパラメータ
   * @returns クエリ結果の行配列
   * @throws {Error} クエリ実行に失敗した場合
   */
  async all(query: string, params: unknown[] = []): Promise<QueryResultRow[]> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    try {
      const [rows] = await this.pool.query(query, params);
      return rows as QueryResultRow[];
    } catch (error) {
      throw new Error(`MySQL query error: ${(error as Error).message}`);
    }
  }

  /**
   * INSERT/UPDATE/DELETEクエリを実行します
   * @param query 実行するSQLクエリ
   * @param params クエリパラメータ
   * @returns 実行結果（影響を受けた行数など）
   * @throws {Error} クエリ実行に失敗した場合
   */
  async run(
    query: string,
    params: unknown[] = [],
  ): Promise<DatabaseExecutionResult> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    try {
      const [result] = await this.pool.query(query, params);
      const header = result as mysql.ResultSetHeader;
      return {
        changes: header.affectedRows ?? 0,
        lastID: header.insertId ?? 0,
      };
    } catch (error) {
      throw new Error(
        `MySQL execution error: ${(error as Error).message}`,
      );
    }
  }

  /**
   * バッチクエリを実行します（結果を返さない）
   * @param query 実行するSQLクエリ
   * @throws {Error} クエリ実行に失敗した場合
   */
  async exec(query: string): Promise<void> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    try {
      await this.pool.query(query);
    } catch (error) {
      throw new Error(`MySQL batch error: ${(error as Error).message}`);
    }
  }

  /**
   * データベース接続をクローズします
   * @throws {Error} 接続クローズに失敗した場合
   */
  async close(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        this.pool = null;
      } catch (error) {
        throw new Error(`MySQL close error: ${(error as Error).message}`);
      }
    }
  }

  /**
   * データベースのメタデータ情報を取得します
   * @returns データベースのメタデータ情報
   */
  getMetadata(): {
    name: string;
    type: string;
    host: string;
    database: string;
  } {
    return {
      name: 'MySQL',
      type: 'mysql',
      host: this.host,
      database: this.database,
    };
  }

  /**
   * テーブル一覧取得用のMySQL固有クエリを取得します
   * @returns テーブル一覧取得クエリ
   */
  getListTablesQuery(): string {
    return "SELECT TABLE_NAME AS table_name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME";
  }

  /**
   * 指定したテーブルの構造説明用のMySQL固有クエリを取得します
   * @param _tableName テーブル名
   * @returns テーブル説明クエリ（パラメータ化済み）
   */
  getDescribeTableQuery(_tableName: string): string {
    return `
      SELECT
        c.COLUMN_NAME AS name,
        c.DATA_TYPE AS type,
        CASE WHEN c.IS_NULLABLE = 'YES' THEN 0 ELSE 1 END AS notnull,
        CASE WHEN tc.CONSTRAINT_TYPE = 'PRIMARY KEY' THEN 1 ELSE 0 END AS pk,
        c.COLUMN_DEFAULT AS dflt_value
      FROM
        INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
        ON c.TABLE_SCHEMA = kcu.TABLE_SCHEMA
        AND c.TABLE_NAME = kcu.TABLE_NAME
        AND c.COLUMN_NAME = kcu.COLUMN_NAME
      LEFT JOIN
        INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
        AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
        AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
      WHERE
        c.TABLE_SCHEMA = DATABASE()
        AND c.TABLE_NAME = ?
      ORDER BY
        c.ORDINAL_POSITION
    `;
  }
}
