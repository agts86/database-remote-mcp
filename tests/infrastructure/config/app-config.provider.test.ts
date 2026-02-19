import type { ConfigService } from '@nestjs/config';
import { AppConfigProvider } from '../../../src/infrastructure/config/app-config.provider';

interface ConfigValues {
  [key: string]: string | undefined;
}

describe('AppConfigProvider', () => {
  function createProvider(values: ConfigValues): AppConfigProvider {
    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const value = values[key];
        if (value !== undefined) {
          return value;
        }
        return defaultValue;
      }),
    } as unknown as ConfigService;

    return new AppConfigProvider(configService);
  }

  describe('getDefaultDatabaseConfig', () => {
    it('DB_SSL=true をpostgres設定へ反映する', () => {
      const provider = createProvider({
        DB_TYPE: 'postgres',
        SERVER: 'db.example.com',
        PORT: '5432',
        DATABASE: 'mydb',
        USER: 'app',
        PASSWORD: 'secret',
        DB_SSL: 'true',
      });

      expect(provider.getDefaultDatabaseConfig()).toEqual({
        type: 'postgres',
        host: 'db.example.com',
        port: 5432,
        database: 'mydb',
        user: 'app',
        password: 'secret',
        ssl: true,
      });
    });

    it('DB_SSL=false をpostgres設定へ反映する', () => {
      const provider = createProvider({
        DB_TYPE: 'postgres',
        DB_SSL: 'false',
      });

      expect(provider.getDefaultDatabaseConfig()).toEqual({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: '',
        ssl: false,
      });
    });

    it('DB_SSL=true をmysql設定へ反映する', () => {
      const provider = createProvider({
        DB_TYPE: 'mysql',
        DB_SSL: 'true',
      });

      expect(provider.getDefaultDatabaseConfig()).toEqual({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'mysql',
        user: 'root',
        password: '',
        ssl: true,
      });
    });

    it('DB_SSLが不正値の場合はエラーを投げる', () => {
      const provider = createProvider({
        DB_TYPE: 'postgres',
        DB_SSL: 'required',
      });

      expect(() => provider.getDefaultDatabaseConfig()).toThrow(
        'Invalid boolean value for DB_SSL',
      );
    });
  });
});
