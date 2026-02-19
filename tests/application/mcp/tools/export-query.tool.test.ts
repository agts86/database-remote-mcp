import { ExportQueryTool } from '../../../../src/application/mcp/rdbms/tools/export-query.tool';
import { RdbmsAdapterFactory } from '../../../../src/infrastructure/rdbms/adapters/rdbms-adapter-factory';
import { AppConfigProvider } from '../../../../src/infrastructure/config/app-config.provider';

// RdbmsAdapterFactoryを完全にモック
jest.mock(
  '../../../../src/infrastructure/rdbms/adapters/rdbms-adapter-factory',
);

const MockedRdbmsAdapterFactory = RdbmsAdapterFactory as jest.MockedClass<
  typeof RdbmsAdapterFactory
>;

describe('ExportQueryTool', () => {
  let tool: ExportQueryTool;
  let mockDatabaseAdapter: any;
  let mockAppConfigProvider: jest.Mocked<AppConfigProvider>;

  beforeEach(() => {
    // DatabaseAdapter のモック作成
    mockDatabaseAdapter = {
      init: jest.fn(),
      all: jest.fn(),
      close: jest.fn(),
    };

    // RdbmsAdapterFactory.createのモック設定
    MockedRdbmsAdapterFactory.create = jest
      .fn()
      .mockReturnValue(mockDatabaseAdapter);

    // AppConfigProviderのモック
    mockAppConfigProvider = {
      getDefaultDatabaseConfig: jest.fn().mockReturnValue({
        type: 'sqlserver',
        database: ':memory:',
      }),
    } as any;

    tool = new ExportQueryTool(mockAppConfigProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ツール定義', () => {
    it('適切なツール定義を返す', () => {
      const definition = tool.getDefinition();

      expect(definition).toHaveProperty('name', 'export_query');
      expect(definition).toHaveProperty('description');
      expect(definition).toHaveProperty('inputSchema');
      expect(definition.inputSchema).toHaveProperty('type', 'object');
      expect(definition.inputSchema).toHaveProperty('properties');
      expect(definition.inputSchema.properties).toHaveProperty('query');
      expect(definition.inputSchema.properties).toHaveProperty('format');
    });
  });

  describe('execute', () => {
    it('CSV 形式でクエリ結果をエクスポートする', async () => {
      const input = {
        query: 'SELECT * FROM users',
        format: 'csv' as const,
      };
      const mockResult = [
        { id: 1, name: 'Test User' },
        { id: 2, name: 'Another User' },
      ];

      mockDatabaseAdapter.all.mockResolvedValue(mockResult);

      const result = await tool.execute(input);

      expect(mockDatabaseAdapter.all).toHaveBeenCalledWith(input.query, []);
      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('Export results (csv)');
    });

    it('JSON 形式でクエリ結果をエクスポートする', async () => {
      const input = {
        query: 'SELECT * FROM users',
        format: 'json' as const,
      };
      const mockResult = [
        { id: 1, name: 'Test User' },
        { id: 2, name: 'Another User' },
      ];

      mockDatabaseAdapter.all.mockResolvedValue(mockResult);

      const result = await tool.execute(input);

      expect(mockDatabaseAdapter.all).toHaveBeenCalledWith(input.query, []);
      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('Export results (json)');
    });

    it('エクスポート実行エラーを適切に処理する', async () => {
      const input = {
        query: 'INVALID SQL',
        format: 'csv' as const,
      };
      const error = new Error('SQL syntax error');

      mockDatabaseAdapter.all.mockRejectedValue(error);

      const result = await tool.execute(input);

      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('Error exporting query');
    });

    it('サポートされていない形式でエラーを投げる', async () => {
      const input = {
        query: 'SELECT * FROM users',
        format: 'xml',
      } as any; // 意図的にサポートされていない形式をテスト

      // 実装では入力検証よりもランタイムエラーになる
      const result = await tool.execute(input);
      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].text).toContain('Error exporting query');
    });
  });
});
