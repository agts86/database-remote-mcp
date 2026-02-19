import type { IDatabaseAdapter } from '../../../domain/database/database-adapter.interface.js';
import type { DatabaseConnectionConfig } from '../../../domain/database/database-connection.interface.js';
import { SqlServerAdapter } from './sqlserver-adapter.js';

interface IAdapterCreationStrategy {
  readonly type: string;
  createAdapter(config: DatabaseConnectionConfig): IDatabaseAdapter;
}

/**
 * SQL Server用のアダプター作成戦略
 * SQL Serverデータベース接続用のアダプターを作成します
 */
class SqlServerCreationStrategy implements IAdapterCreationStrategy {
  readonly type = 'sqlserver';

  /**
   * SQL Serverアダプターを作成します
   * @param config データベース接続設定
   * @returns SQL Serverアダプターインスタンス
   */
  createAdapter(config: DatabaseConnectionConfig): IDatabaseAdapter {
    if (config.type !== 'sqlserver') {
      throw new Error(
        `Invalid config type for SqlServerAdapter: ${String(config.type)}`,
      );
    }
    return new SqlServerAdapter(config);
  }
}

/**
 * データベースアダプターファクトリー
 * ストラテジーパターンを使用してアダプターを作成します
 */
export class DatabaseAdapterFactory {
  private static readonly strategies: IAdapterCreationStrategy[] = [
    new SqlServerCreationStrategy(),
  ];

  /**
   * 設定に基づいてデータベースアダプターを作成します
   * @param config データベース接続設定
   * @returns 作成されたデータベースアダプター
   */
  static create(config: DatabaseConnectionConfig): IDatabaseAdapter {
    const strategy = this.strategies.find((s) => s.type === config.type);

    if (!strategy) {
      throw new Error(`Unsupported database type: ${config.type}`);
    }

    return strategy.createAdapter(config);
  }
}
