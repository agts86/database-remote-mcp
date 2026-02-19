import pg from 'pg';
import type {
  IDatabaseAdapter,
  QueryResultRow,
  DatabaseExecutionResult,
} from '../../../domain/database/database-adapter.interface.js';
import type { PostgresConnectionConfig } from '../../../domain/database/database-connection.interface.js';

/**
 * PostgreSQL データベースアダプター実装
 */
export class PostgresAdapter implements IDatabaseAdapter {
  private pool: pg.Pool | null = null;
  private readonly host: string;
  private readonly database: string;
  private readonly poolConfig: pg.PoolConfig;

  /**
   * PostgreSQLアダプターのインスタンスを作成します
   * @param connectionConfig PostgreSQL接続設定
   */
  constructor(connectionConfig: PostgresConnectionConfig) {
    this.host = connectionConfig.host;
    this.database = connectionConfig.database;

    this.poolConfig = {
      host: connectionConfig.host,
      database: connectionConfig.database,
      port: connectionConfig.port || 5432,
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
      this.pool = new pg.Pool(this.poolConfig);
      // 接続テスト
      const client = await this.pool.connect();
      client.release();
    } catch (error) {
      throw new Error(
        `Failed to connect to PostgreSQL: ${(error as Error).message}`,
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
      const preparedQuery = this.convertPlaceholders(query);
      const result = await this.pool.query(preparedQuery, params);
      return result.rows as QueryResultRow[];
    } catch (error) {
      throw new Error(`PostgreSQL query error: ${(error as Error).message}`);
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
      let preparedQuery = this.convertPlaceholders(query);
      let lastID = 0;

      // INSERT時はRETURNING句を追加してIDを取得
      if (this.isInsertQuery(preparedQuery)) {
        preparedQuery = `${preparedQuery.replace(/;\s*$/, '')} RETURNING *`;
        const result = await this.pool.query(preparedQuery, params);
        lastID = this.extractLastId(result.rows as Record<string, unknown>[]);
        return { changes: result.rowCount ?? 0, lastID };
      }

      const result = await this.pool.query(preparedQuery, params);
      return { changes: result.rowCount ?? 0, lastID };
    } catch (error) {
      throw new Error(
        `PostgreSQL execution error: ${(error as Error).message}`,
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
      throw new Error(`PostgreSQL batch error: ${(error as Error).message}`);
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
        throw new Error(`PostgreSQL close error: ${(error as Error).message}`);
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
      name: 'PostgreSQL',
      type: 'postgres',
      host: this.host,
      database: this.database,
    };
  }

  /**
   * テーブル一覧取得用のPostgreSQL固有クエリを取得します
   * @returns テーブル一覧取得クエリ
   */
  getListTablesQuery(): string {
    return "SELECT tablename AS table_name FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename";
  }

  /**
   * 指定したテーブルの構造説明用のPostgreSQL固有クエリを取得します
   * @param _tableName テーブル名
   * @returns テーブル説明クエリ（パラメータ化済み）
   */
  getDescribeTableQuery(_tableName: string): string {
    return `
      SELECT
        c.column_name AS name,
        c.data_type AS type,
        CASE WHEN c.is_nullable = 'YES' THEN 0 ELSE 1 END AS notnull,
        CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN 1 ELSE 0 END AS pk,
        c.column_default AS dflt_value
      FROM
        information_schema.columns c
      LEFT JOIN
        information_schema.key_column_usage kcu
        ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
      LEFT JOIN
        information_schema.table_constraints tc
        ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'PRIMARY KEY'
      WHERE
        c.table_name = $1
      ORDER BY
        c.ordinal_position
    `;
  }

  /**
   * `?` プレースホルダーを `$1, $2, ...` 形式に変換します
   * @param query SQLクエリ
   * @returns 変換後のクエリ
   */
  private convertPlaceholders(query: string): string {
    let index = 0;
    return query.replace(/\?/g, () => {
      index++;
      return `$${index}`;
    });
  }

  /**
   * INSERT文かどうかを判定します
   * @param query SQLクエリ
   * @returns INSERT文の場合true
   */
  private isInsertQuery(query: string): boolean {
    return query.trim().toUpperCase().startsWith('INSERT');
  }

  /**
   * INSERT結果から最後のIDを抽出します
   * @param rows クエリ結果行
   * @returns 最後に挿入されたID
   */
  private extractLastId(rows: Record<string, unknown>[]): number {
    if (rows.length === 0) {
      return 0;
    }
    const firstRow = rows[0];
    const idValue = firstRow.id;
    if (typeof idValue === 'number') {
      return idValue;
    }
    return 0;
  }
}
