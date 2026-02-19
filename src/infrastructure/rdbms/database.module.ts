import { Module } from '@nestjs/common';
import { McpService } from '../../application/rdbms/mcp/mcp.service.js';
import { ReadQueryTool } from '../../application/rdbms/mcp/tools/read-query.tool.js';
import { WriteQueryTool } from '../../application/rdbms/mcp/tools/write-query.tool.js';
import { ExportQueryTool } from '../../application/rdbms/mcp/tools/export-query.tool.js';
import { ListTablesTool } from '../../application/rdbms/mcp/tools/list-tables.tool.js';
import { DescribeTableTool } from '../../application/rdbms/mcp/tools/describe-table.tool.js';
import { GetSchemaTool } from '../../application/rdbms/mcp/tools/get-schema.tool.js';

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
