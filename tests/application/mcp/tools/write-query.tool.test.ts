import { WriteQueryTool } from '../../../../src/application/mcp/rdbms/tools/write-query.tool';
import { RdbmsAdapterFactory } from '../../../../src/infrastructure/rdbms/adapters/rdbms-adapter-factory';
import { AppConfigProvider } from '../../../../src/infrastructure/config/app-config.provider';

// RdbmsAdapterFactoryを完全にモック
jest.mock(
  '../../../../src/infrastructure/rdbms/adapters/rdbms-adapter-factory',
);

const MockedRdbmsAdapterFactory = RdbmsAdapterFactory as jest.MockedClass<
  typeof RdbmsAdapterFactory
>;

describe('WriteQueryTool', () => {
  let tool: WriteQueryTool;
  let mockAppConfigProvider: jest.Mocked<AppConfigProvider>;
  let mockDatabaseAdapter: any;

  beforeEach(() => {
    // モックの作成
    mockDatabaseAdapter = {
      init: jest.fn(),
      run: jest.fn(),
      close: jest.fn(),
    };

    // RdbmsAdapterFactory.createのモック設定
    MockedRdbmsAdapterFactory.create = jest
      .fn()
      .mockReturnValue(mockDatabaseAdapter);

    mockAppConfigProvider = {
      getDefaultDatabaseConfig: jest
        .fn()
        .mockReturnValue({ type: 'sqlserver', database: ':memory:' }),
    } as any;

    tool = new WriteQueryTool(mockAppConfigProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ツール定義', () => {
    it('適切なツール定義を返す', () => {
      const definition = tool.getDefinition();

      expect(definition).toHaveProperty('name', 'write_query');
      expect(definition).toHaveProperty('description');
      expect(definition).toHaveProperty('inputSchema');
      expect(definition.inputSchema).toHaveProperty('type', 'object');
      expect(definition.inputSchema).toHaveProperty('properties');
      expect(definition.inputSchema.properties).toHaveProperty('query');
    });
  });

  describe('execute', () => {
    it('INSERT クエリを正常に実行する', async () => {
      const input = { query: "INSERT INTO users (name) VALUES ('Test User')" };
      const mockResult = { changes: 1, lastID: 1 };

      mockDatabaseAdapter.run.mockResolvedValue(mockResult);

      const result = await tool.execute(input);

      expect(mockDatabaseAdapter.init).toHaveBeenCalled();
      expect(mockDatabaseAdapter.run).toHaveBeenCalledWith(input.query, []);
      expect(mockDatabaseAdapter.close).toHaveBeenCalled();
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('UPDATE クエリを正常に実行する', async () => {
      const input = {
        query: "UPDATE users SET name = 'Updated Name' WHERE id = 1",
      };
      const mockResult = { changes: 1 };

      mockDatabaseAdapter.run.mockResolvedValue(mockResult);

      const result = await tool.execute(input);

      expect(mockDatabaseAdapter.run).toHaveBeenCalledWith(input.query, []);
      expect(result).toHaveProperty('content');
    });

    it('DELETE クエリを正常に実行する', async () => {
      const input = { query: 'DELETE FROM users WHERE id = 1' };
      const mockResult = { changes: 1 };

      mockDatabaseAdapter.run.mockResolvedValue(mockResult);

      const result = await tool.execute(input);

      expect(mockDatabaseAdapter.run).toHaveBeenCalledWith(input.query, []);
      expect(result).toHaveProperty('content');
    });

    it('書き込み系クエリ実行エラーを適切に処理する', async () => {
      const input = { query: 'INSERT INTO invalid_table VALUES (1)' };
      const error = new Error('Table does not exist');

      mockDatabaseAdapter.run.mockRejectedValue(error);

      const result = await tool.execute(input);

      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('Error executing write query');
    });
  });
});
