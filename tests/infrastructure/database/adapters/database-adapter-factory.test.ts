import { DatabaseAdapterFactory } from '../../../../src/infrastructure/database/adapters/database-adapter-factory';
import type { DatabaseConnectionConfig } from '../../../../src/domain/database/database-connection.interface';

// 外部DB接続をモック
jest.mock('mssql', () => ({}));
jest.mock('pg', () => ({
  __esModule: true,
  default: { Pool: jest.fn() },
  Pool: jest.fn(),
}));
jest.mock('mysql2/promise', () => ({
  __esModule: true,
  default: { createPool: jest.fn() },
  createPool: jest.fn(),
}));

describe('DatabaseAdapterFactory', () => {
  describe('create', () => {
    it('sqlserverタイプでSqlServerAdapterを作成する', () => {
      const config: DatabaseConnectionConfig = {
        type: 'sqlserver',
        server: 'localhost',
        database: 'testdb',
      };

      const adapter = DatabaseAdapterFactory.create(config);
      expect(adapter).toBeDefined();
      expect(adapter.getMetadata().type).toBe('sqlserver');
    });

    it('postgresタイプでPostgresAdapterを作成する', () => {
      const config: DatabaseConnectionConfig = {
        type: 'postgres',
        host: 'localhost',
        database: 'testdb',
      };

      const adapter = DatabaseAdapterFactory.create(config);
      expect(adapter).toBeDefined();
      expect(adapter.getMetadata().type).toBe('postgres');
    });

    it('mysqlタイプでMysqlAdapterを作成する', () => {
      const config: DatabaseConnectionConfig = {
        type: 'mysql',
        host: 'localhost',
        database: 'testdb',
      };

      const adapter = DatabaseAdapterFactory.create(config);
      expect(adapter).toBeDefined();
      expect(adapter.getMetadata().type).toBe('mysql');
    });

    it('サポートされていないタイプでエラーをスローする', () => {
      const config = {
        type: 'unsupported',
        database: 'testdb',
      } as unknown as DatabaseConnectionConfig;

      expect(() => DatabaseAdapterFactory.create(config)).toThrow(
        'Unsupported database type',
      );
    });
  });

  describe('resolveConfig', () => {
    it('sqlserverのデフォルト値を適用する', () => {
      const config = DatabaseAdapterFactory.resolveConfig('sqlserver', {});
      expect(config).toEqual({
        type: 'sqlserver',
        server: 'localhost',
        port: 1433,
        database: 'master',
        user: 'sa',
        password: '',
      });
    });

    it('postgresのデフォルト値を適用する', () => {
      const config = DatabaseAdapterFactory.resolveConfig('postgres', {});
      expect(config).toEqual({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: '',
      });
    });

    it('mysqlのデフォルト値を適用する', () => {
      const config = DatabaseAdapterFactory.resolveConfig('mysql', {});
      expect(config).toEqual({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'mysql',
        user: 'root',
        password: '',
      });
    });

    it('環境変数の値でデフォルト値を上書きする', () => {
      const config = DatabaseAdapterFactory.resolveConfig('postgres', {
        server: 'db.example.com',
        port: 5433,
        database: 'myapp',
        user: 'admin',
        password: 'secret',
      });
      expect(config).toEqual({
        type: 'postgres',
        host: 'db.example.com',
        port: 5433,
        database: 'myapp',
        user: 'admin',
        password: 'secret',
      });
    });

    it('サポートされていないタイプでエラーをスローする', () => {
      expect(() =>
        DatabaseAdapterFactory.resolveConfig('unsupported', {}),
      ).toThrow('Unsupported database type');
    });
  });
});
