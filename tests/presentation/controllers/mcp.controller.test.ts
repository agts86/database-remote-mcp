import { Test, TestingModule } from '@nestjs/testing';
import { McpController } from '../../../src/presentation/controllers/rdbms/mcp/mcp.controller';
import { McpService } from '../../../src/application/rdbms/mcp/mcp.service';

describe('McpController', () => {
  let controller: McpController;
  let mockMcpService: jest.Mocked<McpService>;

  beforeEach(async () => {
    // McpService のモック作成
    mockMcpService = {
      handleHttpMcpMessage: jest.fn(),
      handleHttpMcpError: jest.fn(),
      executeToolByName: jest.fn(),
      formatToolResponse: jest.fn(),
      formatToolError: jest.fn(),
      getHttpToolsDefinition: jest.fn(),
      getMcpInfoResponse: jest.fn().mockReturnValue({
        name: 'DataBase Remote  MCP Server',
        version: '1.0.0',
        capabilities: {},
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpController],
      providers: [{ provide: McpService, useValue: mockMcpService }],
    }).compile();

    controller = module.get<McpController>(McpController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('コントローラー初期化', () => {
    it('McpController が正常に作成される', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('getMcpInfo', () => {
    it('MCP サーバー情報を返す', () => {
      const result = controller.getMcpInfo();

      expect(result).toHaveProperty('name', 'DataBase Remote  MCP Server');
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('capabilities');
    });
  });

  describe('handleMcpPost', () => {
    it('MCP メッセージを正常に処理する', async () => {
      const message = { method: 'initialize', params: {} };
      const expectedResponse = { result: { capabilities: {} } };

      mockMcpService.handleHttpMcpMessage.mockResolvedValue(expectedResponse);

      const result = await controller.handleMcpPost(message);

      expect(mockMcpService.handleHttpMcpMessage).toHaveBeenCalledWith(message);
      expect(result).toBe(expectedResponse);
    });

    it('エラーが発生した場合はエラーハンドラーに委譲する', async () => {
      const message = { id: '123', method: 'invalid_method', params: {} };
      const error = new Error('Method not found');
      const handledError = {
        error: { code: -32601, message: 'Method not found' },
      };

      mockMcpService.handleHttpMcpMessage.mockRejectedValue(error);
      mockMcpService.handleHttpMcpError.mockReturnValue(handledError);

      const result = await controller.handleMcpPost(message);

      expect(mockMcpService.handleHttpMcpMessage).toHaveBeenCalledWith(message);
      expect(mockMcpService.handleHttpMcpError).toHaveBeenCalledWith(
        error,
        message.id,
      );
      expect(result).toBe(handledError);
    });
  });

  describe('invokeTool', () => {
    it('ツールを正常に実行してレスポンスをフォーマットする', async () => {
      const toolName = 'read_query';
      const input = { query: 'SELECT * FROM users' };
      const executionResult = { rows: [{ id: 1, name: 'Test' }] };
      const formattedResult = { content: 'formatted result', isError: false };

      mockMcpService.executeToolByName.mockResolvedValue(executionResult);
      mockMcpService.formatToolResponse.mockReturnValue(formattedResult);

      const result = await controller.invokeTool(toolName, input);

      expect(mockMcpService.executeToolByName).toHaveBeenCalledWith(
        toolName,
        input,
      );
      expect(mockMcpService.formatToolResponse).toHaveBeenCalledWith(
        executionResult,
      );
      expect(result).toBe(formattedResult);
    });

    it('ツール実行エラーをフォーマットして返す', async () => {
      const toolName = 'invalid_tool';
      const input = { query: 'test' };
      const error = new Error('Unknown tool');
      const formattedError = { content: 'error message', isError: true };

      mockMcpService.executeToolByName.mockRejectedValue(error);
      mockMcpService.formatToolError.mockReturnValue(formattedError);

      const result = await controller.invokeTool(toolName, input);

      expect(mockMcpService.executeToolByName).toHaveBeenCalledWith(
        toolName,
        input,
      );
      expect(mockMcpService.formatToolError).toHaveBeenCalledWith(error);
      expect(result).toBe(formattedError);
    });
  });

  describe('getTools', () => {
    it('利用可能なツール一覧を返す', () => {
      const mockTools = [
        { name: 'read_query', description: 'Read data' },
        { name: 'write_query', description: 'Write data' },
      ];

      mockMcpService.getHttpToolsDefinition.mockReturnValue(mockTools);

      const result = controller.getTools();

      expect(mockMcpService.getHttpToolsDefinition).toHaveBeenCalled();
      expect(result).toEqual({ tools: mockTools });
    });
  });
});
