import { Injectable } from '@nestjs/common';
import { AppConfigProvider } from '../../infrastructure/config/app-config.provider.js';
import type { IMcpRuntime } from './mcp-runtime.interface.js';
import { NoSqlRuntimeService } from './nosql/runtime.service.js';
import { RdbmsRuntimeService } from './rdbms/runtime.service.js';

interface RuntimeMapping {
  dbTypes: string[];
  runtime: IMcpRuntime;
}

/**
 * DB_TYPEに応じてMCPランタイムを解決するサービス
 */
@Injectable()
export class McpRuntimeResolverService {
  constructor(
    private readonly appConfigProvider: AppConfigProvider,
    private readonly rdbmsRuntimeService: RdbmsRuntimeService,
    private readonly noSqlRuntimeService: NoSqlRuntimeService,
  ) {}

  resolveRuntime(): IMcpRuntime {
    const dbType = this.appConfigProvider.dbType;
    const mappings: RuntimeMapping[] = [
      {
        dbTypes: ['sqlserver', 'postgres', 'mysql'],
        runtime: this.rdbmsRuntimeService,
      },
      {
        dbTypes: ['mongodb'],
        runtime: this.noSqlRuntimeService,
      },
    ];

    const mapping = mappings.find((candidate) =>
      candidate.dbTypes.includes(dbType),
    );

    if (!mapping) {
      throw new Error(
        `Unsupported DB_TYPE: ${dbType}. Supported values: sqlserver, postgres, mysql, mongodb`,
      );
    }

    return mapping.runtime;
  }
}
