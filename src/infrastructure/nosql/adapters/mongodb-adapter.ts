import { MongoClient } from 'mongodb';
import type { INoSqlAdapter } from '../../../domain/nosql/nosql-adapter.interface.js';
import type { MongoConnectionConfig } from '../../../domain/nosql/nosql-connection.interface.js';

/**
 * MongoDB向けNoSQLアダプター
 */
export class MongoDbAdapter implements INoSqlAdapter {
  private client: MongoClient | null = null;

  constructor(private readonly config: MongoConnectionConfig) {}

  async init(): Promise<void> {
    if (this.client) {
      return;
    }

    const client = new MongoClient(this.config.uri);
    await client.connect();
    this.client = client;
  }

  async listCollections(database?: string): Promise<string[]> {
    const targetDatabase = this.resolveDatabase(database);
    const client = this.getInitializedClient();

    const collections = await client
      .db(targetDatabase)
      .listCollections({}, { nameOnly: true })
      .toArray();

    return collections
      .map((collection) => collection.name)
      .filter((name): name is string => typeof name === 'string')
      .sort((left, right) => left.localeCompare(right));
  }

  async close(): Promise<void> {
    if (!this.client) {
      return;
    }

    const currentClient = this.client;
    this.client = null;
    await currentClient.close();
  }

  getMetadata(): { type: string; database: string; uri: string } {
    return {
      type: this.config.type,
      database: this.config.database,
      uri: this.config.uri,
    };
  }

  private resolveDatabase(database?: string): string {
    const normalized = database?.trim();
    if (normalized && normalized.length > 0) {
      return normalized;
    }
    return this.config.database;
  }

  private getInitializedClient(): MongoClient {
    if (!this.client) {
      throw new Error('MongoDB adapter is not initialized');
    }
    return this.client;
  }
}

