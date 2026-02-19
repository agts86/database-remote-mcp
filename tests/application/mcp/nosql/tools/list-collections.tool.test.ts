import { ListCollectionsTool } from '../../../../../src/application/mcp/nosql/tools/list-collections.tool';
import { AppConfigProvider } from '../../../../../src/infrastructure/config/app-config.provider';
import { NoSqlAdapterFactory } from '../../../../../src/infrastructure/nosql/adapters/nosql-adapter-factory';

jest.mock(
  '../../../../../src/infrastructure/nosql/adapters/nosql-adapter-factory',
);

const MockedNoSqlAdapterFactory = NoSqlAdapterFactory as jest.MockedClass<
  typeof NoSqlAdapterFactory
>;

interface MockNoSqlAdapter {
  init: jest.Mock<Promise<void>, []>;
  listCollections: jest.Mock<Promise<string[]>, [string | undefined]>;
  close: jest.Mock<Promise<void>, []>;
  getMetadata: jest.Mock<{ type: string; database: string }, []>;
}

describe('ListCollectionsTool', () => {
  let tool: ListCollectionsTool;
  let mockNoSqlAdapter: MockNoSqlAdapter;
  let mockAppConfigProvider: jest.Mocked<AppConfigProvider>;

  beforeEach(() => {
    mockNoSqlAdapter = {
      init: jest.fn().mockResolvedValue(undefined),
      listCollections: jest.fn().mockResolvedValue([]),
      close: jest.fn().mockResolvedValue(undefined),
      getMetadata: jest.fn().mockReturnValue({
        type: 'mongodb',
        database: 'app_db',
      }),
    };

    MockedNoSqlAdapterFactory.create = jest
      .fn()
      .mockReturnValue(mockNoSqlAdapter as never);

    mockAppConfigProvider = {
      getDefaultNoSqlConfig: jest.fn().mockReturnValue({
        type: 'mongodb',
        uri: 'mongodb://localhost:27017',
        database: 'app_db',
      }),
    } as unknown as jest.Mocked<AppConfigProvider>;

    tool = new ListCollectionsTool(mockAppConfigProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ツール定義', () => {
    it('定義情報を返す', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('list_collections');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.properties).toHaveProperty('database');
    });
  });

  describe('execute', () => {
    it('MongoDBのコレクション一覧を取得する', async () => {
      mockNoSqlAdapter.listCollections.mockResolvedValue(['events', 'users']);

      const result = await tool.execute({});

      expect(mockNoSqlAdapter.init).toHaveBeenCalledTimes(1);
      expect(mockNoSqlAdapter.listCollections).toHaveBeenCalledWith(undefined);
      expect(mockNoSqlAdapter.close).toHaveBeenCalledTimes(1);
      expect(result.content[0].text).toContain('Collections in "app_db"');
      expect(result.content[0].text).toContain('events');
    });

    it('database引数がある場合は指定DBで一覧を取得する', async () => {
      mockNoSqlAdapter.listCollections.mockResolvedValue(['orders']);

      const result = await tool.execute({ database: 'analytics' });

      expect(mockNoSqlAdapter.listCollections).toHaveBeenCalledWith('analytics');
      expect(result.content[0].text).toContain('Collections in "analytics"');
    });

    it('一覧取得失敗時はエラーメッセージを返す', async () => {
      mockNoSqlAdapter.listCollections.mockRejectedValue(new Error('auth failed'));

      const result = await tool.execute({});

      expect(result.content[0].text).toContain('Error listing collections');
      expect(result.content[0].text).toContain('auth failed');
      expect(mockNoSqlAdapter.close).toHaveBeenCalledTimes(1);
    });

    it('close失敗時でも結果レスポンスは返す', async () => {
      mockNoSqlAdapter.listCollections.mockResolvedValue(['logs']);
      mockNoSqlAdapter.close.mockRejectedValue(new Error('close failed'));

      const result = await tool.execute({});

      expect(result.content[0].text).toContain('Collections in "app_db"');
      expect(result.content[0].text).toContain('logs');
    });
  });
});

