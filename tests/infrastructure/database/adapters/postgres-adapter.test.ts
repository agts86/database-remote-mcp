import { PostgresAdapter } from '../../../../src/infrastructure/database/adapters/postgres-adapter';
import type { PostgresConnectionConfig } from '../../../../src/domain/database/database-connection.interface';

// pgモジュールをモック
jest.mock('pg', () => {
  const mockClient = {
    release: jest.fn(),
  };

  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    query: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  };

  return {
    __esModule: true,
    default: {
      Pool: jest.fn(() => mockPool),
    },
    Pool: jest.fn(() => mockPool),
    _mockPool: mockPool,
    _mockClient: mockClient,
  };
});

// モックプールを取得するヘルパー
function getMockPool(): {
  connect: jest.Mock;
  query: jest.Mock;
  end: jest.Mock;
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pgMock = require('pg');
  return pgMock._mockPool;
}

describe('PostgresAdapter', () => {
  let adapter: PostgresAdapter;
  const testConfig: PostgresConnectionConfig = {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'testdb',
    user: 'testuser',
    password: 'testpass',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new PostgresAdapter(testConfig);
  });

  describe('init', () => {
    it('Pool接続を初期化する', async () => {
      const mockPool = getMockPool();
      await adapter.init();
      expect(mockPool.connect).toHaveBeenCalled();
    });

    it('接続失敗時にエラーをスローする', async () => {
      const mockPool = getMockPool();
      mockPool.connect.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(adapter.init()).rejects.toThrow(
        'Failed to connect to PostgreSQL',
      );
    });
  });

  describe('all', () => {
    it('SELECTクエリを実行して結果を返す', async () => {
      const mockPool = getMockPool();
      const mockRows = [{ id: 1, name: 'test' }];
      mockPool.query.mockResolvedValue({ rows: mockRows });

      await adapter.init();
      const results = await adapter.all('SELECT * FROM users WHERE id = ?', [
        1,
      ]);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1],
      );
      expect(results).toEqual(mockRows);
    });

    it('初期化前にエラーをスローする', async () => {
      await expect(adapter.all('SELECT 1')).rejects.toThrow(
        'Database not initialized',
      );
    });

    it('クエリエラーを適切にラップする', async () => {
      const mockPool = getMockPool();
      mockPool.query.mockRejectedValue(new Error('syntax error'));

      await adapter.init();
      await expect(adapter.all('INVALID SQL')).rejects.toThrow(
        'PostgreSQL query error',
      );
    });
  });

  describe('run', () => {
    it('UPDATE文を実行して影響行数を返す', async () => {
      const mockPool = getMockPool();
      mockPool.query.mockResolvedValue({ rowCount: 3 });

      await adapter.init();
      const result = await adapter.run(
        'UPDATE users SET name = ? WHERE active = ?',
        ['newname', true],
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE users SET name = $1 WHERE active = $2',
        ['newname', true],
      );
      expect(result.changes).toBe(3);
    });

    it('INSERT文でRETURNING句を追加する', async () => {
      const mockPool = getMockPool();
      mockPool.query.mockResolvedValue({
        rows: [{ id: 42, name: 'test' }],
        rowCount: 1,
      });

      await adapter.init();
      const result = await adapter.run(
        'INSERT INTO users (name) VALUES (?)',
        ['test'],
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO users (name) VALUES ($1) RETURNING *',
        ['test'],
      );
      expect(result.lastID).toBe(42);
      expect(result.changes).toBe(1);
    });

    it('初期化前にエラーをスローする', async () => {
      await expect(adapter.run('DELETE FROM users')).rejects.toThrow(
        'Database not initialized',
      );
    });
  });

  describe('exec', () => {
    it('バッチクエリを実行する', async () => {
      const mockPool = getMockPool();
      mockPool.query.mockResolvedValue(undefined);

      await adapter.init();
      await adapter.exec('CREATE TABLE test (id SERIAL PRIMARY KEY)');

      expect(mockPool.query).toHaveBeenCalledWith(
        'CREATE TABLE test (id SERIAL PRIMARY KEY)',
      );
    });

    it('初期化前にエラーをスローする', async () => {
      await expect(adapter.exec('CREATE TABLE t()')).rejects.toThrow(
        'Database not initialized',
      );
    });
  });

  describe('close', () => {
    it('プール接続を終了する', async () => {
      const mockPool = getMockPool();
      await adapter.init();
      await adapter.close();
      expect(mockPool.end).toHaveBeenCalled();
    });

    it('未初期化でもエラーにならない', async () => {
      await expect(adapter.close()).resolves.toBeUndefined();
    });
  });

  describe('getMetadata', () => {
    it('PostgreSQLメタデータを返す', () => {
      const metadata = adapter.getMetadata();
      expect(metadata).toEqual({
        name: 'PostgreSQL',
        type: 'postgres',
        host: 'localhost',
        database: 'testdb',
      });
    });
  });

  describe('getListTablesQuery', () => {
    it('PostgreSQL用テーブル一覧クエリを返す', () => {
      const query = adapter.getListTablesQuery();
      expect(query).toContain('pg_catalog.pg_tables');
      expect(query).toContain("schemaname = 'public'");
    });
  });

  describe('getDescribeTableQuery', () => {
    it('PostgreSQL用テーブル構造クエリを返す', () => {
      const query = adapter.getDescribeTableQuery('users');
      expect(query).toContain('information_schema.columns');
      expect(query).toContain('$1');
    });
  });
});
