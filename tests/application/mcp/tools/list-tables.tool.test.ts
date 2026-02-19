import { ListTablesTool } from '../../../../src/application/mcp/tools/list-tables.tool';
import { DatabaseAdapterFactory } from '../../../../src/infrastructure/database/adapters/database-adapter-factory';
import { AppConfigProvider } from '../../../../src/infrastructure/config/app-config.provider';

// DatabaseAdapterFactoryを完全にモック
jest.mock(
  '../../../../src/infrastructure/database/adapters/database-adapter-factory',
);

const MockedDatabaseAdapterFactory = DatabaseAdapterFactory as jest.MockedClass<
  typeof DatabaseAdapterFactory
>;

describe('ListTablesTool', () => {
  let tool: ListTablesTool;
  let mockDatabaseAdapter: any;
  let mockAppConfigProvider: jest.Mocked<AppConfigProvider>;

  beforeEach(() => {
    // DatabaseAdapter のモック作成
    mockDatabaseAdapter = {
      init: jest.fn(),
      all: jest.fn(),
      close: jest.fn(),
      getListTablesQuery: jest.fn().mockReturnValue('SELECT table_name FROM mock_tables'),
      getDescribeTableQuery: jest.fn().mockReturnValue('SELECT * FROM mock_describe'),
    };

    // DatabaseAdapterFactory.createのモック設定
    MockedDatabaseAdapterFactory.create = jest
      .fn()
      .mockReturnValue(mockDatabaseAdapter);

    // AppConfigProviderのモック
    mockAppConfigProvider = {
      getDefaultDatabaseConfig: jest.fn().mockReturnValue({
        type: 'sqlserver',
        database: ':memory:',
      }),
    } as any;

    tool = new ListTablesTool(mockAppConfigProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ツール定義', () => {
    it('適切なツール定義を返す', () => {
      const definition = tool.getDefinition();

      expect(definition).toHaveProperty('name', 'list_tables');
      expect(definition).toHaveProperty('description');
      expect(definition).toHaveProperty('inputSchema');
      expect(definition.inputSchema).toHaveProperty('type', 'object');
    });
  });

  describe('execute', () => {
    it('データベースのテーブル一覧を取得する', async () => {
      const input = {};
      const mockTables = [
        { name: 'users' },
        { name: 'orders' },
        { name: 'products' },
      ];

      mockDatabaseAdapter.all.mockResolvedValue(mockTables);

      const result = await tool.execute(input);

      expect(mockDatabaseAdapter.all).toHaveBeenCalled();
      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('Tables:');
    });

    it('テーブル一覧取得エラーを適切に処理する', async () => {
      const input = {};
      const error = new Error('Database connection failed');

      mockDatabaseAdapter.all.mockRejectedValue(error);

      const result = await tool.execute(input);

      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('Error listing tables');
    });

    it('空のテーブル一覧を正常に処理する', async () => {
      const input = {};
      const mockTables: any[] = [];

      mockDatabaseAdapter.all.mockResolvedValue(mockTables);

      const result = await tool.execute(input);

      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('Tables:');
    });

    it('PostgreSQLタイプでテーブル一覧を取得する', async () => {
      mockAppConfigProvider.getDefaultDatabaseConfig.mockReturnValue({
        type: 'postgres',
        host: 'localhost',
        database: 'testdb',
      });

      const mockTables = [
        { table_name: 'users' },
        { table_name: 'orders' },
      ];
      mockDatabaseAdapter.all.mockResolvedValue(mockTables);

      const result = await tool.execute({});

      expect(mockDatabaseAdapter.getListTablesQuery).toHaveBeenCalled();
      expect(mockDatabaseAdapter.all).toHaveBeenCalledWith(
        'SELECT table_name FROM mock_tables',
        [],
      );
      expect(result.content[0].text).toContain('Tables:');
    });
  });
});
