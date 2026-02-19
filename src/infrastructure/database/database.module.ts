import { Module } from '@nestjs/common';
import { McpService } from '../../application/mcp/mcp.service.js';
import { ReadQueryTool } from '../../application/mcp/tools/read-query.tool.js';
import { WriteQueryTool } from '../../application/mcp/tools/write-query.tool.js';
import { ExportQueryTool } from '../../application/mcp/tools/export-query.tool.js';
import { ListTablesTool } from '../../application/mcp/tools/list-tables.tool.js';
import { DescribeTableTool } from '../../application/mcp/tools/describe-table.tool.js';
import { GetSchemaTool } from '../../application/mcp/tools/get-schema.tool.js';

/**
 * データベース関連機能のモジュール
 */
@Module({
  providers: [
    McpService,
    ReadQueryTool,
    WriteQueryTool,
    ExportQueryTool,
    ListTablesTool,
    DescribeTableTool,
    GetSchemaTool,
  ],
  exports: [McpService],
})
export class McpServiceModule {}
