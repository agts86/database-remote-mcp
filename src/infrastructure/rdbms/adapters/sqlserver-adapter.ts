import sql from 'mssql';
import type {
  IDatabaseAdapter,
  QueryResultRow,
  DatabaseExecutionResult,
} from '../../../domain/rdbms/rdbms-adapter.interface.js';
import type { SqlServerConnectionConfig } from '../../../domain/rdbms/rdbms-connection.interface.js';

/**
 * SQL Server データベースアダプター実装
 */
export class SqlServerAdapter implements IDatabaseAdapter {
  private pool: sql.ConnectionPool | null = null;
  private readonly config: sql.config;
  private readonly server: string;
  private readonly database: string;

  /**
   * SQL Serverアダプターのインスタンスを作成します
   * @param connectionConfig SQL Server接続設定
   */
  constructor(private readonly connectionConfig: SqlServerConnectionConfig) {
    this.server = connectionConfig.server;
    this.database = connectionConfig.database;

    // Create SQL Server connection config
    this.config = {
      server: connectionConfig.server,
      database: connectionConfig.database,
      port: connectionConfig.port || 1433,
      options: {
        trustServerCertificate: true,
        enableArithAbort: true,
      },
    };

    // Add authentication options
    if (connectionConfig.user && connectionConfig.password) {
      this.config.user = connectionConfig.user;
      this.config.password = connectionConfig.password;
    } else {
      // Use Windows authentication if no username/password provided
      this.config.options!.trustedConnection = true;
    }
  }

  /**
   * データベース接続を初期化します
   * @throws {Error} 接続に失敗した場合
   */
  async init(): Promise<void> {
    try {
      this.pool = await new sql.ConnectionPool(this.config).connect();
    } catch (error) {
      throw new Error(
        `Failed to connect to SQL Server: ${(error as Error).message}`,
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
      const request = this.pool.request();

      // Add parameters to the request
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });

      // Replace ? with named parameters
      let paramIndex = 0;
      const preparedQuery = query.replace(
        /\?/g,
        () => `@param${paramIndex++}`,
      );

      const result = await request.query(preparedQuery);
      return result.recordset as QueryResultRow[];
    } catch (error) {
      throw new Error(`SQL Server query error: ${(error as Error).message}`);
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
      const request = this.pool.request();

      // Add parameters to the request
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });

      // Replace ? with named parameters
      let paramIndex = 0;
      const preparedQuery = query.replace(
        /\?/g,
        () => `@param${paramIndex++}`,
      );

      let lastID = 0;
      let changes = 0;

      // Handle INSERT queries specially to get identity value
      if (query.trim().toUpperCase().startsWith('INSERT')) {
        const insertQuery = `${preparedQuery}; SELECT SCOPE_IDENTITY() as insertedId, @@ROWCOUNT as affected;`;
        const result = await request.query(insertQuery);
        const insertResult = this.extractInsertResult(result.recordset);
        lastID = insertResult.lastID;
        changes = insertResult.changes;
      } else {
        // For UPDATE/DELETE operations
        const queryWithRowCount = `${preparedQuery}; SELECT @@ROWCOUNT as affected;`;
        const result = await request.query(queryWithRowCount);
        changes = this.extractAffectedRows(result.recordset);
      }

      return { changes, lastID };
    } catch (error) {
      throw new Error(
        `SQL Server execution error: ${(error as Error).message}`,
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
      const request = this.pool.request();
      await request.batch(query);
    } catch (error) {
      throw new Error(`SQL Server batch error: ${(error as Error).message}`);
    }
  }

  /**
   * データベース接続をクローズします
   * @throws {Error} 接続クローズに失敗した場合
   */
  async close(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.close();
        this.pool = null;
      } catch (error) {
        throw new Error(`SQL Server close error: ${(error as Error).message}`);
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
    server: string;
    database: string;
  } {
    return {
      name: 'SQL Server',
      type: 'sqlserver',
      server: this.server,
      database: this.database,
    };
  }

  /**
   * テーブル一覧取得用のSQL Server固有クエリを取得します
   * @returns テーブル一覧取得クエリ
   */
  getListTablesQuery(): string {
    return "SELECT TABLE_NAME as name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME";
  }

  /**
   * 指定したテーブルの構造説明用のSQL Server固有クエリを取得します
   * @param tableName テーブル名
   * @returns テーブル説明クエリ（パラメータ化済み）
   */
  getDescribeTableQuery(_tableName: string): string {
    // DECLARE + パラメータ化（DROP TABLEと同じアプローチ）
    return `
      DECLARE @tableName NVARCHAR(128) = ?;
      SELECT 
        c.COLUMN_NAME as name,
        c.DATA_TYPE as type,
        CASE WHEN c.IS_NULLABLE = 'YES' THEN 0 ELSE 1 END as notnull,
        CASE WHEN pk.CONSTRAINT_TYPE = 'PRIMARY KEY' THEN 1 ELSE 0 END as pk,
        c.COLUMN_DEFAULT as dflt_value
      FROM 
        INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN 
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu ON c.TABLE_NAME = kcu.TABLE_NAME AND c.COLUMN_NAME = kcu.COLUMN_NAME
      LEFT JOIN 
        INFORMATION_SCHEMA.TABLE_CONSTRAINTS pk ON kcu.CONSTRAINT_NAME = pk.CONSTRAINT_NAME AND pk.CONSTRAINT_TYPE = 'PRIMARY KEY'
      WHERE 
        c.TABLE_NAME = @tableName
      ORDER BY 
        c.ORDINAL_POSITION
    `;
  }

  /**
   * INSERTクエリの実行結果から最後IDと影響行数を抽出します
   * @param recordset クエリ結果セット
   * @returns 最後IDと影響行数
   */
  private extractInsertResult(recordset: unknown[]): {
    lastID: number;
    changes: number;
  } {
    if (recordset.length === 0) {
      return { lastID: 0, changes: 0 };
    }

    const firstRow = recordset[0];
    if (this.isInsertResultRow(firstRow)) {
      return {
        lastID: firstRow.insertedId || 0,
        changes: firstRow.affected || 0,
      };
    }

    return { lastID: 0, changes: 0 };
  }

  /**
   * クエリ結果から影響を受けた行数を抽出します
   * @param recordset クエリ結果セット
   * @returns 影響を受けた行数
   */
  private extractAffectedRows(recordset: unknown[]): number {
    if (recordset.length === 0) {
      return 0;
    }

    const firstRow = recordset[0];
    if (this.isAffectedResultRow(firstRow)) {
      return firstRow.affected || 0;
    }

    return 0;
  }

  /**
   * INSERT結果行かどうかをタイプガードで判定します
   * @param row チェックする行データ
   * @returns INSERT結果行の場合true
   */
  private isInsertResultRow(
    row: unknown,
  ): row is { insertedId: number; affected: number } {
    return (
      typeof row === 'object' &&
      row !== null &&
      'insertedId' in row &&
      'affected' in row &&
      typeof (row as { insertedId: unknown }).insertedId === 'number' &&
      typeof (row as { affected: unknown }).affected === 'number'
    );
  }

  /**
   * 影響行数結果行かどうかをタイプガードで判定します
   * @param row チェックする行データ
   * @returns 影響行数結果行の場合true
   */
  private isAffectedResultRow(row: unknown): row is { affected: number } {
    return (
      typeof row === 'object' &&
      row !== null &&
      'affected' in row &&
      typeof (row as { affected: unknown }).affected === 'number'
    );
  }
}
