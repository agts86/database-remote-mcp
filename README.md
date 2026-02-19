# DataBase Remote MCP Server

リモートデータベースへのアクセス機能を Model Context Protocol (MCP) ツールとして公開する HTTP サーバー。

## 機能

- データベーステーブル管理: テーブル作成、変更、削除、一覧取得
- スキーマ探索: データベーススキーマの取得とテーブル詳細情報の取得
- クエリ実行: 読み取り専用クエリ（SELECT）と書き込みクエリ（INSERT/UPDATE/DELETE）の実行
- データエクスポート: クエリ結果をCSVまたはJSON形式でエクスポート
- ビジネスインサイト管理: insights.txtファイルへのインサイト追加と一覧表示（タイムスタンプ付き）

## システム要件

- Node.js >= 22
- pnpm (推奨) または npm

## 主要依存関係

- `@modelcontextprotocol/sdk`: MCP フレームワーク
- `@nestjs/core`: NestJS フレームワーク
- `@nestjs/platform-fastify`: Fastify プラットフォーム
- `@nestjs/swagger`: OpenAPI/Swagger ドキュメント生成
- `@fastify/swagger`: Fastify用Swaggerプラグイン
- `@fastify/swagger-ui`: Swagger UI統合
- `mssql`: SQL Server データベースドライバー
- `typescript`: TypeScript コンパイラ
- `jest`: テストフレームワーク

## 起動

```bash
pnpm install
pnpm build
pnpm start
```

または開発モード（ファイル変更の自動リロード）:

```bash
pnpm run start:dev
```

デバッグモード:

```bash
pnpm run start:debug
```

**開発モード時の追加機能:**

- Swagger UI: `http://localhost:3000/swagger` でAPIドキュメントを確認可能
- NODE_ENV=development で自動的に有効化されます

## Docker で開発する

開発用コンテナを使えば Node のバージョンや依存を気にせず手元のエディタで編集できます（ファイル変更は自動リロード）。

```bash
# ビルド＆起動
docker compose up --build

# 別ターミナルでテストなど実行
docker compose exec app pnpm test
```

- `./docker-compose.yml` は `Dockerfile.dev` を利用します。初回ビルド時にコンテナ内へ `pnpm install` 済み。
- リポジトリ全体を `/app` にバインドし、NestJSのwatchモードでソース変更時にサーバーを自動再起動します。
- `.env` を置いておくと `--env-file` で環境変数が読み込まれます。

## Docker で本番環境を構築する

本番環境用の `Dockerfile` を使用して、Azure App Service 等へデプロイできます。

```bash
# マルチステージビルドで最適化されたイメージを作成
docker build -t database-remote-mcp:latest .

# コンテナ実行
docker run -p 3000:3000 --env-file .env database-remote-mcp:latest
```

- `Dockerfile` はマルチステージビルドで本番環境用に最適化されています。
- ビルド済みのコードのみを含み、イメージサイズが小さくなっています。

## MCP クライアントでの使用

1. HTTPサーバーを起動:

   ```bash
   pnpm start
   ```

2. MCP クライアントで以下を設定:

   **標準エンドポイント:**

   ```json
   {
     "servers": {
       "database-remote-mcp": {
         "type": "http",
         "url": "http://localhost:3000/mcp",
         "tools": ["*"]
       }
     }
   }
   ```

   **Streamable HTTPエンドポイント（推奨）:**

   ```json
   {
     "servers": {
       "database-remote-mcp": {
         "type": "http",
         "url": "http://localhost:3000/mcp/stream",
         "tools": ["*"]
       }
     }
   }
   ```

   **codex (VS Code) の場合:**

   `config.toml` (macOS/Linux: `~/.codex/config.toml`) に以下を追加:

   ```toml
    [mcp_servers.database-remote-mcp]
    url = "http://localhost:3000/mcp/stream"
    enabled = true
   ```

   **claude code の場合:**

   以下のコマンドを実行

   ```sh
    claude mcp add --transport http database-remote-mcp http://localhost:3000/mcp/stream
   ```

3. MCP クライアントを再起動して MCP ツールを使用開始

## MCP ツール概要

| Tool           | Name           | Params              | 説明                                                                 |
| -------------- | -------------- | ------------------- | -------------------------------------------------------------------- |
| Read Query     | read_query     | query               | データベースに対してSELECT文を実行                                   |
| Write Query    | write_query    | query               | データベースに対してINSERT/UPDATE/DELETE文を実行                     |
| List Tables    | list_tables    | -                   | データベース内のテーブル一覧を取得                                   |
| Describe Table | describe_table | table_name          | 指定したテーブルの詳細情報を取得                                     |
| Get Schema     | get_schema     | -                   | データベースの完全なスキーマ情報を取得                               |
| Create Table   | create_table   | query               | 新しいテーブルを作成                                                 |
| Alter Table    | alter_table    | query               | 既存のテーブル構造を変更                                             |
| Drop Table     | drop_table     | table_name, confirm | テーブルを削除（安全確認付き）                                       |
| Export Query   | export_query   | query, format       | クエリ結果をCSV/JSON形式でエクスポート                               |
| Append Insight | append_insight | insight             | ビジネスインサイトをinsights.txtファイルに追加（タイムスタンプ付き） |
| List Insights  | list_insights  | -                   | insights.txtファイルからビジネスインサイト一覧を取得                 |

## データベース対応状況

- **SQL Server**: 完全対応（mssqlドライバー使用）
- **その他のデータベース**: 将来拡張予定（アダプターパターンで実装済み）

## 設定

デフォルトのデータベース接続設定は環境変数で指定できます。
`.env.sample` を `.env` にコピーして、以下の環境変数を設定してください：

```env
# アプリケーション設定
APP_PORT=3000          # サーバーのポート番号（デフォルト: 3000）
ALLOWED_ORIGINS=       # CORS許可オリジン（カンマ区切り、デフォルト: http://localhost:3000）

# MCPツール設定
ENABLED_TOOLS=         # 有効化するMCPツール（カンマ区切り、未設定時は全ツール有効化）
                       # 利用可能なツール: read_query, write_query, export_query, list_tables,
                       # describe_table, get_schema, create_table, alter_table, drop_table,
                       # append_insight, list_insights
                       # 例: ENABLED_TOOLS=read_query,list_tables,describe_table

# データベース接続設定（SQL Server固定）
SERVER=localhost//OBPM  # サーバー名（デフォルト: localhost//OBPM）
PORT=1433              # ポート番号（デフォルト: 1433）
DATABASE=OBPMDATA      # データベース名（デフォルト: OBPMDATA）
USER=sa                # ユーザー名（デフォルト: sa）
PASSWORD=              # パスワード（必須）
```

## テスト

```bash
# テスト実行
pnpm test

# カバレッジレポート付き
pnpm test:coverage

# ウォッチモード
pnpm test:watch
```

## アーキテクチャ

- **ドメイン駆動設計**: ビジネスロジックとインフラストラクチャを分離
- **アダプターパターン**: 複数のデータベースタイプに対応可能な設計
- **ストラテジーパターン**: データベースタイプ別のクエリ戦略を実装

## API詳細ドキュメント

### データベースクエリツール

#### Read Query Tool

**パラメータ:**

- `query` (string, required): 実行するSQL SELECT文

**レスポンス例:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Query results: [\n  {\n    \"id\": 1,\n    \"name\": \"Example\"\n  }\n]"
    }
  ]
}
```

#### Write Query Tool

**パラメータ:**

- `query` (string, required): 実行するSQL INSERT/UPDATE/DELETE文

**レスポンス例:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Query executed successfully. Changes: 1, Last ID: 123"
    }
  ]
}
```

### テーブル管理ツール

#### List Tables Tool

**パラメータ:** なし

**レスポンス例:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Tables: [\n  {\n    \"table_name\": \"users\"\n  },\n  {\n    \"table_name\": \"orders\"\n  }\n]"
    }
  ]
}
```

#### Describe Table Tool

**パラメータ:**

- `table_name` (string, required): 詳細を取得するテーブル名

**レスポンス例:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Table structure for 'users':\n[\n  {\n    \"column_name\": \"id\",\n    \"data_type\": \"int\",\n    \"is_nullable\": \"NO\"\n  }\n]"
    }
  ]
}
```

### エクスポートツール

#### Export Query Tool

**パラメータ:**

- `query` (string, required): エクスポート用SQL SELECT文
- `format` (string, required): エクスポート形式（"csv" または "json"）

**レスポンス例:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "Export results (csv):\nid,name\n1,Example\n"
    }
  ]
}
```
