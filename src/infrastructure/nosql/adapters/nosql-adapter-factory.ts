import type { INoSqlAdapter } from '../../../domain/nosql/nosql-adapter.interface.js';
import type { NoSqlConnectionConfig } from '../../../domain/nosql/nosql-connection.interface.js';
import { MongoDbAdapter } from './mongodb-adapter.js';

/**
 * 環境変数から読み取ったNoSQL接続情報
 */
export interface RawNoSqlEnv {
  uri?: string;
  database?: string;
}

interface INoSqlAdapterCreationStrategy {
  readonly type: string;
  createAdapter(config: NoSqlConnectionConfig): INoSqlAdapter;
  getDefaultConfig(env: RawNoSqlEnv): NoSqlConnectionConfig;
}

/**
 * MongoDB用のアダプター作成戦略
 */
class MongoDbCreationStrategy implements INoSqlAdapterCreationStrategy {
  readonly type = 'mongodb';

  createAdapter(config: NoSqlConnectionConfig): INoSqlAdapter {
    if (config.type !== 'mongodb') {
      throw new Error(
        `Invalid config type for MongoDbAdapter: ${String(config.type)}`,
      );
    }
    return new MongoDbAdapter(config);
  }

  getDefaultConfig(env: RawNoSqlEnv): NoSqlConnectionConfig {
    return {
      type: 'mongodb',
      uri: env.uri ?? 'mongodb://localhost:27017',
      database: env.database ?? 'admin',
    };
  }
}

/**
 * NoSQLアダプターファクトリー
 */
export class NoSqlAdapterFactory {
  private static readonly strategies: INoSqlAdapterCreationStrategy[] = [
    new MongoDbCreationStrategy(),
  ];

  /**
   * 設定に基づいてNoSQLアダプターを作成
   * @param config NoSQL接続設定
   */
  static create(config: NoSqlConnectionConfig): INoSqlAdapter {
    const strategy = this.strategies.find((s) => s.type === config.type);

    if (!strategy) {
      throw new Error(`Unsupported NoSQL type: ${config.type}`);
    }

    return strategy.createAdapter(config);
  }

  /**
   * DB種別と環境変数から接続設定を解決
   * @param dbType DB_TYPE
   * @param env 環境変数由来の接続情報
   */
  static resolveConfig(dbType: string, env: RawNoSqlEnv): NoSqlConnectionConfig {
    const strategy = this.strategies.find((s) => s.type === dbType);

    if (!strategy) {
      throw new Error(`Unsupported NoSQL type: ${dbType}`);
    }

    return strategy.getDefaultConfig(env);
  }
}

