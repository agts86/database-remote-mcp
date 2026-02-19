import { MysqlAdapter } from '../../../../src/infrastructure/database/adapters/mysql-adapter';
import type { MysqlConnectionConfig } from '../../../../src/domain/database/database-connection.interface';

// mysql2/promiseモジュールをモック
jest.mock('mysql2/promise', () => {
  const mockConnection = {
    release: jest.fn(),
  };

  const mockPool = {
    getConnection: jest.fn().mockResolvedValue(mockConnection),
    query: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  };

  return {
    __esModule: true,
    default: {
      createPool: jest.fn(() => mockPool),
    },
    createPool: jest.fn(() => mockPool),
    _mockPool: mockPool,
    _mockConnection: mockConnection,
  };
});

// モックプールを取得するヘルパー
function getMockPool(): {
  getConnection: jest.Mock;
  query: jest.Mock;
  end: jest.Mock;
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mysqlMock = require('mysql2/promise');
  return mysqlMock._mockPool;
}

function getMockCreatePool(): jest.Mock {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mysqlMock = require('mysql2/promise');
  return mysqlMock.default.createPool as jest.Mock;
}

describe('MysqlAdapter', () => {
  let adapter: MysqlAdapter;
  const testConfig: MysqlConnectionConfig = {
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    database: 'testdb',
    user: 'testuser',
    password: 'testpass',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new MysqlAdapter(testConfig);
  });

  describe('init', () => {
    it('Pool接続を初期化する', async () => {
      const mockPool = getMockPool();
      await adapter.init();
      expect(mockPool.getConnection).toHaveBeenCalled();
    });

    it('ssl=trueの場合はTLS設定付きで初期化する', async () => {
      const createPool = getMockCreatePool();
      const sslAdapter = new MysqlAdapter({
        ...testConfig,
        ssl: true,
      });

      await sslAdapter.init();

      expect(createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          ssl: {
            rejectUnauthorized: false,
          },
        }),
      );
    });

    it('接続失敗時にエラーをスローする', async () => {
      const mockPool = getMockPool();
      mockPool.getConnection.mockRejectedValueOnce(
        new Error('Connection refused'),
      );

      await expect(adapter.init()).rejects.toThrow(
        'Failed to connect to MySQL',
      );
    });
  });

  describe('all', () => {
    it('SELECTクエリを実行して結果を返す', async () => {
      const mockPool = getMockPool();
      const mockRows = [{ id: 1, name: 'test' }];
      mockPool.query.mockResolvedValue([mockRows, []]);

      await adapter.init();
      const results = await adapter.all(
        'SELECT * FROM users WHERE id = ?',
        [1],
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?',
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
        'MySQL query error',
      );
    });
  });

  describe('run', () => {
    it('UPDATE文を実行して影響行数を返す', async () => {
      const mockPool = getMockPool();
      mockPool.query.mockResolvedValue([
        { affectedRows: 3, insertId: 0 },
        undefined,
      ]);

      await adapter.init();
      const result = await adapter.run(
        'UPDATE users SET name = ? WHERE active = ?',
        ['newname', true],
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE users SET name = ? WHERE active = ?',
        ['newname', true],
      );
      expect(result.changes).toBe(3);
    });

    it('INSERT文でinsertIdを返す', async () => {
      const mockPool = getMockPool();
      mockPool.query.mockResolvedValue([
        { affectedRows: 1, insertId: 42 },
        undefined,
      ]);

      await adapter.init();
      const result = await adapter.run(
        'INSERT INTO users (name) VALUES (?)',
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
      mockPool.query.mockResolvedValue([undefined, undefined]);

      await adapter.init();
      await adapter.exec(
        'CREATE TABLE test (id INT AUTO_INCREMENT PRIMARY KEY)',
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        'CREATE TABLE test (id INT AUTO_INCREMENT PRIMARY KEY)',
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
    it('MySQLメタデータを返す', () => {
      const metadata = adapter.getMetadata();
      expect(metadata).toEqual({
        name: 'MySQL',
        type: 'mysql',
        host: 'localhost',
        database: 'testdb',
      });
    });
  });

  describe('getListTablesQuery', () => {
    it('MySQL用テーブル一覧クエリを返す', () => {
      const query = adapter.getListTablesQuery();
      expect(query).toContain('INFORMATION_SCHEMA.TABLES');
      expect(query).toContain('TABLE_SCHEMA = DATABASE()');
    });
  });

  describe('getDescribeTableQuery', () => {
    it('MySQL用テーブル構造クエリを返す', () => {
      const query = adapter.getDescribeTableQuery('users');
      expect(query).toContain('INFORMATION_SCHEMA.COLUMNS');
      expect(query).toContain('?');
    });
  });
});
