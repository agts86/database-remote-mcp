import { Test, TestingModule } from '@nestjs/testing';
import { RdbmsRuntimeService } from '../../../src/application/mcp/rdbms/runtime.service';
import { AppConfigProvider } from '../../../src/infrastructure/config/app-config.provider';
import { ReadQueryTool } from '../../../src/application/mcp/rdbms/tools/read-query.tool';
import { WriteQueryTool } from '../../../src/application/mcp/rdbms/tools/write-query.tool';
import { ExportQueryTool } from '../../../src/application/mcp/rdbms/tools/export-query.tool';
import { ListTablesTool } from '../../../src/application/mcp/rdbms/tools/list-tables.tool';
import { DescribeTableTool } from '../../../src/application/mcp/rdbms/tools/describe-table.tool';
import { GetSchemaTool } from '../../../src/application/mcp/rdbms/tools/get-schema.tool';
import { CreateTableTool } from '../../../src/application/mcp/rdbms/tools/create-table.tool';
import { AlterTableTool } from '../../../src/application/mcp/rdbms/tools/alter-table.tool';
import { DropTableTool } from '../../../src/application/mcp/rdbms/tools/drop-table.tool';
import { ListInsightsTool } from '../../../src/application/mcp/rdbms/tools/list-insights.tool';
import { AppendInsightTool } from '../../../src/application/mcp/rdbms/tools/append-insight.tool';

describe('RdbmsRuntimeService', () => {
  let service: RdbmsRuntimeService;
  let mockAppConfigProvider: jest.Mocked<AppConfigProvider>;
  let mockReadQueryTool: jest.Mocked<ReadQueryTool>;
  let mockWriteQueryTool: jest.Mocked<WriteQueryTool>;
  let mockExportQueryTool: jest.Mocked<ExportQueryTool>;
  let mockListTablesTool: jest.Mocked<ListTablesTool>;
  let mockDescribeTableTool: jest.Mocked<DescribeTableTool>;
  let mockGetSchemaTool: jest.Mocked<GetSchemaTool>;
  let mockCreateTableTool: jest.Mocked<CreateTableTool>;
  let mockAlterTableTool: jest.Mocked<AlterTableTool>;
  let mockDropTableTool: jest.Mocked<DropTableTool>;
  let mockListInsightsTool: jest.Mocked<ListInsightsTool>;
  let mockAppendInsightTool: jest.Mocked<AppendInsightTool>;

  beforeEach(async () => {
    // AppConfigProvider のモック作成
    mockAppConfigProvider = {
      enabledTools: [],
    } as any;

    // モックオブジェクトの作成
    mockReadQueryTool = {
      name: 'read_query',
      execute: jest.fn(),
      getDefinition: jest
        .fn()
        .mockReturnValue({ name: 'read_query', description: 'Read data' }),
    } as any;

    mockWriteQueryTool = {
      name: 'write_query',
      execute: jest.fn(),
      getDefinition: jest
        .fn()
        .mockReturnValue({ name: 'write_query', description: 'Write data' }),
    } as any;

    mockExportQueryTool = {
      name: 'export_query',
      execute: jest.fn(),
      getDefinition: jest
        .fn()
        .mockReturnValue({ name: 'export_query', description: 'Export data' }),
    } as any;

    mockListTablesTool = {
      name: 'list_tables',
      execute: jest.fn(),
      getDefinition: jest
        .fn()
        .mockReturnValue({ name: 'list_tables', description: 'List tables' }),
    } as any;

    mockDescribeTableTool = {
      name: 'describe_table',
      execute: jest.fn(),
      getDefinition: jest.fn().mockReturnValue({
        name: 'describe_table',
        description: 'Describe table',
      }),
    } as any;

    mockGetSchemaTool = {
      name: 'get_schema',
      execute: jest.fn(),
      getDefinition: jest
        .fn()
        .mockReturnValue({ name: 'get_schema', description: 'Get schema' }),
    } as any;

    mockCreateTableTool = {
      name: 'create_table',
      execute: jest.fn(),
      getDefinition: jest
        .fn()
        .mockReturnValue({ name: 'create_table', description: 'Create table' }),
    } as any;

    mockAlterTableTool = {
      name: 'alter_table',
      execute: jest.fn(),
      getDefinition: jest
        .fn()
        .mockReturnValue({ name: 'alter_table', description: 'Alter table' }),
    } as any;

    mockDropTableTool = {
      name: 'drop_table',
      execute: jest.fn(),
      getDefinition: jest
        .fn()
        .mockReturnValue({ name: 'drop_table', description: 'Drop table' }),
    } as any;

    mockListInsightsTool = {
      name: 'list_insights',
      execute: jest.fn(),
      getDefinition: jest.fn().mockReturnValue({
        name: 'list_insights',
        description: 'List insights',
      }),
    } as any;

    mockAppendInsightTool = {
      name: 'append_insight',
      execute: jest.fn(),
      getDefinition: jest.fn().mockReturnValue({
        name: 'append_insight',
        description: 'Append insight',
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RdbmsRuntimeService,
        { provide: AppConfigProvider, useValue: mockAppConfigProvider },
        { provide: ReadQueryTool, useValue: mockReadQueryTool },
        { provide: WriteQueryTool, useValue: mockWriteQueryTool },
        { provide: ExportQueryTool, useValue: mockExportQueryTool },
        { provide: ListTablesTool, useValue: mockListTablesTool },
        { provide: DescribeTableTool, useValue: mockDescribeTableTool },
        { provide: GetSchemaTool, useValue: mockGetSchemaTool },
        { provide: CreateTableTool, useValue: mockCreateTableTool },
        { provide: AlterTableTool, useValue: mockAlterTableTool },
        { provide: DropTableTool, useValue: mockDropTableTool },
        { provide: ListInsightsTool, useValue: mockListInsightsTool },
        { provide: AppendInsightTool, useValue: mockAppendInsightTool },
      ],
    }).compile();

    service = module.get<RdbmsRuntimeService>(RdbmsRuntimeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('サービス初期化', () => {
    it('RdbmsRuntimeService が正常に作成される', () => {
      expect(service).toBeDefined();
    });
  });

  describe('executeToolByName', () => {
    it('read_query ツールを正常に実行する', async () => {
      const input = { query: 'SELECT * FROM users' };
      const expectedResult = { content: [{ text: 'result', type: 'text' }] };

      mockReadQueryTool.execute.mockResolvedValue(expectedResult);

      const result = await service.executeToolByName('read_query', input);

      expect(mockReadQueryTool.execute).toHaveBeenCalledWith(input);
      expect(result).toBe(expectedResult);
    });

    it('存在しないツール名でエラーを投げる', async () => {
      const input = { query: 'test' };

      await expect(
        service.executeToolByName('unknown_tool', input),
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('getHttpToolsDefinition', () => {
    it('すべてのツール定義を取得する', () => {
      const definitions = service.getHttpToolsDefinition();

      expect(definitions).toHaveLength(11);
      expect(definitions[0]).toHaveProperty('name');
      expect(definitions[0]).toHaveProperty('description');
      expect(mockReadQueryTool.getDefinition).toHaveBeenCalled();
      expect(mockWriteQueryTool.getDefinition).toHaveBeenCalled();
    });
  });

  describe('handleHttpMcpMessage', () => {
    it('initialize メッセージを正常に処理する', async () => {
      const message = { method: 'initialize', params: {} };

      const result = await service.handleHttpMcpMessage(message);

      expect(result).toHaveProperty('result');
      expect(result.result).toHaveProperty('capabilities');
    });

    it('tools/list メッセージを正常に処理する', async () => {
      const message = { method: 'tools/list', params: {} };

      const result = await service.handleHttpMcpMessage(message);

      expect(result).toHaveProperty('result');
      expect(result.result).toHaveProperty('tools');
      expect(Array.isArray(result.result.tools)).toBe(true);
    });

    it('不明なメソッドでエラーを返す', async () => {
      const message = { method: 'unknown_method', params: {} };

      await expect(service.handleHttpMcpMessage(message)).rejects.toThrow(
        'Method not found: unknown_method',
      );
    });
  });

  describe('formatToolResponse', () => {
    it('正常な結果をフォーマットする', () => {
      const result = { data: 'test result' };

      const formatted = service.formatToolResponse(result);

      expect(formatted).toHaveProperty('content');
      expect(Array.isArray(formatted.content)).toBe(true);
      expect(formatted.content[0]).toHaveProperty('text');
      expect(formatted.content[0].text).toContain('test result');
    });
  });

  describe('formatToolError', () => {
    it('エラーをフォーマットする', () => {
      const error = new Error('Test error');

      const formatted = service.formatToolError(error);

      expect(formatted).toHaveProperty('content');
      expect(formatted).toHaveProperty('isError', true);
      expect(Array.isArray(formatted.content)).toBe(true);
      expect(formatted.content[0]).toHaveProperty('text');
      expect(formatted.content[0].text).toContain('Test error');
    });
  });
});
