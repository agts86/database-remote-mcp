import { Test, TestingModule } from '@nestjs/testing';
import { McpService } from '../../../src/application/rdbms/mcp/mcp.service';
import { AppConfigProvider } from '../../../src/infrastructure/config/app-config.provider';
import { ReadQueryTool } from '../../../src/application/rdbms/mcp/tools/read-query.tool';
import { WriteQueryTool } from '../../../src/application/rdbms/mcp/tools/write-query.tool';
import { ExportQueryTool } from '../../../src/application/rdbms/mcp/tools/export-query.tool';
import { ListTablesTool } from '../../../src/application/rdbms/mcp/tools/list-tables.tool';
import { DescribeTableTool } from '../../../src/application/rdbms/mcp/tools/describe-table.tool';
import { GetSchemaTool } from '../../../src/application/rdbms/mcp/tools/get-schema.tool';
import { CreateTableTool } from '../../../src/application/rdbms/mcp/tools/create-table.tool';
import { AlterTableTool } from '../../../src/application/rdbms/mcp/tools/alter-table.tool';
import { DropTableTool } from '../../../src/application/rdbms/mcp/tools/drop-table.tool';
import { ListInsightsTool } from '../../../src/application/rdbms/mcp/tools/list-insights.tool';
import { AppendInsightTool } from '../../../src/application/rdbms/mcp/tools/append-insight.tool';

describe('McpService - ツールフィルタリング機能', () => {
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

  beforeEach(() => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('ENABLED_TOOLS が未設定の場合、全11ツールが有効化される', async () => {
    const mockAppConfigProvider = {
      enabledTools: [],
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpService,
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

    const service = module.get<McpService>(McpService);
    const definitions = service.getHttpToolsDefinition();

    expect(definitions).toHaveLength(11);
  });

  it('ENABLED_TOOLS で特定のツールのみ有効化される（大文字小文字区別なし）', async () => {
    const limitedConfigProvider = {
      enabledTools: ['READ_QUERY', 'list_tables', 'Describe_Table'],
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpService,
        { provide: AppConfigProvider, useValue: limitedConfigProvider },
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

    const service = module.get<McpService>(McpService);
    const definitions = service.getHttpToolsDefinition();

    expect(definitions).toHaveLength(3);
    expect(definitions.map((d) => d.name).sort()).toEqual([
      'describe_table',
      'list_tables',
      'read_query',
    ]);
  });

  it('無効なツール名を指定した場合でも、有効なツールのみフィルタリングされる', async () => {
    const configWithInvalidTool = {
      enabledTools: ['read_query', 'invalid_tool', 'list_tables'],
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpService,
        { provide: AppConfigProvider, useValue: configWithInvalidTool },
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

    const service = module.get<McpService>(McpService);
    const definitions = service.getHttpToolsDefinition();

    // invalid_tool は無視され、read_query と list_tables のみ有効化
    expect(definitions).toHaveLength(2);
    expect(definitions.map((d) => d.name).sort()).toEqual([
      'list_tables',
      'read_query',
    ]);
  });

  it('フィルタリングされたツールは executeToolByName で実行できない', async () => {
    const limitedConfigProvider = {
      enabledTools: ['read_query'],
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpService,
        { provide: AppConfigProvider, useValue: limitedConfigProvider },
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

    const service = module.get<McpService>(McpService);

    // read_query は有効化されているので実行可能
    mockReadQueryTool.execute.mockResolvedValue({
      content: [{ text: 'result', type: 'text' }],
    });
    await expect(
      service.executeToolByName('read_query', { query: 'test' }),
    ).resolves.toBeDefined();

    // write_query は無効化されているので実行不可
    await expect(
      service.executeToolByName('write_query', { query: 'test' }),
    ).rejects.toThrow('Unknown tool: write_query');
  });
});
