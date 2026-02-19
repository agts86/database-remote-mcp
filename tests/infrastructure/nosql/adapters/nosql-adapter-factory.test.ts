import { MongoDbAdapter } from '../../../../src/infrastructure/nosql/adapters/mongodb-adapter';
import { NoSqlAdapterFactory } from '../../../../src/infrastructure/nosql/adapters/nosql-adapter-factory';

describe('NoSqlAdapterFactory', () => {
  describe('create', () => {
    it('mongodb設定からMongoDbAdapterを生成する', () => {
      const adapter = NoSqlAdapterFactory.create({
        type: 'mongodb',
        uri: 'mongodb://localhost:27017',
        database: 'appdb',
      });

      expect(adapter).toBeInstanceOf(MongoDbAdapter);
    });

    it('未対応NoSQL種別の場合はエラーを投げる', () => {
      expect(() =>
        NoSqlAdapterFactory.create({
          type: 'unknown' as never,
          uri: 'mongodb://localhost:27017',
          database: 'appdb',
        }),
      ).toThrow('Unsupported NoSQL type');
    });
  });

  describe('resolveConfig', () => {
    it('mongodb接続設定を解決する', () => {
      const config = NoSqlAdapterFactory.resolveConfig('mongodb', {
        uri: 'mongodb://mongo.example.com:27017',
        database: 'analytics',
      });

      expect(config).toEqual({
        type: 'mongodb',
        uri: 'mongodb://mongo.example.com:27017',
        database: 'analytics',
      });
    });

    it('未設定項目はデフォルト値を使う', () => {
      const config = NoSqlAdapterFactory.resolveConfig('mongodb', {});

      expect(config).toEqual({
        type: 'mongodb',
        uri: 'mongodb://localhost:27017',
        database: 'admin',
      });
    });

    it('未対応NoSQL種別の場合はエラーを投げる', () => {
      expect(() => NoSqlAdapterFactory.resolveConfig('redis', {})).toThrow(
        'Unsupported NoSQL type',
      );
    });
  });
});

