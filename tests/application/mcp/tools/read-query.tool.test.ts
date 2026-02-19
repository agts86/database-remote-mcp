import { ReadQueryTool } from '../../../../src/application/rdbms/mcp/tools/read-query.tool';
import { DatabaseAdapterFactory } from '../../../../src/infrastructure/rdbms/adapters/database-adapter-factory';
import { AppConfigProvider } from '../../../../src/infrastructure/config/app-config.provider';

// DatabaseAdapterFactoryを完全にモック
jest.mock(
  '../../../../src/infrastructure/rdbms/adapters/database-adapter-factory',
);

const MockedDatabaseAdapterFactory = DatabaseAdapterFactory as jest.MockedClass<
  typeof DatabaseAdapterFactory
>;

describe('ReadQueryTool', () => {
  let tool: ReadQueryTool;
  let mockAppConfigProvider: jest.Mocked<AppConfigProvider>;
  let mockDatabaseAdapter: any;

  beforeEach(() => {
    // モックの作成
    mockDatabaseAdapter = {
      init: jest.fn(),
      all: jest.fn(),
      close: jest.fn(),
    };

    // DatabaseAdapterFactory.createのモック設定
    MockedDatabaseAdapterFactory.create = jest
      .fn()
      .mockReturnValue(mockDatabaseAdapter);

    mockAppConfigProvider = {
      getDefaultDatabaseConfig: jest
        .fn()
        .mockReturnValue({ type: 'sqlserver', database: ':memory:' }),
    } as any;

    tool = new ReadQueryTool(mockAppConfigProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ツール定義', () => {
    it('適切なツール定義を返す', () => {
      const definition = tool.getDefinition();

      expect(definition).toHaveProperty('name', 'read_query');
      expect(definition).toHaveProperty('description');
      expect(definition).toHaveProperty('inputSchema');
      expect(definition.inputSchema).toHaveProperty('type', 'object');
      expect(definition.inputSchema).toHaveProperty('properties');
      expect(definition.inputSchema.properties).toHaveProperty('query');
    });
  });

  describe('execute', () => {
    it('正常なクエリを実行する', async () => {
      const input = { query: 'SELECT * FROM users' };
      const mockResult = [{ id: 1, name: 'Test User' }];

      mockDatabaseAdapter.all.mockResolvedValue(mockResult);

      const result = await tool.execute(input);

      expect(mockDatabaseAdapter.init).toHaveBeenCalled();
      expect(mockDatabaseAdapter.all).toHaveBeenCalledWith(input.query, []);
      expect(mockDatabaseAdapter.close).toHaveBeenCalled();
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('クエリ実行エラーを適切に処理する', async () => {
      const input = { query: 'INVALID SQL' };
      const error = new Error('SQL syntax error');

      mockDatabaseAdapter.all.mockRejectedValue(error);

      const result = await tool.execute(input);

      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('Error executing query');
    });

    it('空のクエリでエラーレスポンスを返す', async () => {
      const input = { query: '' };

      mockDatabaseAdapter.all.mockResolvedValue(undefined);

      const result = await tool.execute(input);

      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('Query results: undefined');
    });
  });
});
