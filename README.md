# DataBase Remote MCP Server

リモートデータベースへのアクセス機能を Model Context Protocol (MCP) ツールとして公開する HTTP サーバーです。

## 概要

- 単一エンドポイント（`/mcp`, `/mcp/stream`）で MCP を提供
- `DB_TYPE` に応じてランタイムを自動切替
  - `sqlserver` / `postgres` / `mysql` -> RDBMS runtime
  - `mongodb` -> NoSQL runtime
- ツールの有効化は環境変数で制御
  - RDBMS: `ENABLED_TOOLS`
  - NoSQL: `ENABLED_NOSQL_TOOLS`

## 現在の対応機能

### RDBMS ツール

- `read_query`
- `write_query`
- `export_query`
- `list_tables`
- `describe_table`
- `get_schema`
- `create_table`
- `alter_table`
- `drop_table`
- `append_insight`
- `list_insights`

### NoSQL ツール

- `list_collections`（MongoDB のコレクション一覧取得）

NoSQL は現在 `list_collections` のみ実装済みです。

## サポートDB

- SQL Server（`mssql`）
- PostgreSQL（`pg`）
- MySQL（`mysql2`）
- MongoDB（`mongodb`）

## システム要件

- Node.js >= 22
- pnpm 推奨

## 起動

```bash
pnpm install
pnpm build
pnpm start
```

開発モード:

```bash
pnpm start:dev
```

## MCP クライアント設定例

標準 HTTP:

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

Streamable HTTP（推奨）:

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

Codex (`~/.codex/config.toml`) 例:

```toml
[mcp_servers.database-remote-mcp]
url = "http://localhost:3000/mcp/stream"
enabled = true
```

## 環境変数

`.env.sample` を `.env` にコピーして設定します。

### 共通

```env
APP_PORT=3000
ALLOWED_ORIGINS=
DB_TYPE=postgres
```

### ツール有効化

```env
ENABLED_TOOLS=
ENABLED_NOSQL_TOOLS=
```

### RDBMS 接続

```env
SERVER=localhost
PORT=5432
DATABASE=postgres
USER=postgres
PASSWORD=
DB_SSL=
```

`DB_TYPE` が `sqlserver` / `postgres` / `mysql` のときに利用されます。

### MongoDB 接続

```env
MONGO_URI=mongodb://localhost:27017
MONGO_DATABASE=admin
```

`MONGO_URI` 未設定時は `mongodb://SERVER:PORT` を使用します。

## アーキテクチャ

依存方向: `Presentation -> Application -> Domain <- Infrastructure`

```text
src/
├── presentation/
│   └── mcp/
│       ├── mcp.controller.ts
│       ├── mcp.controller.module.ts
│       └── sse.interceptor.ts
├── application/
│   └── mcp/
│       ├── mcp.service.ts
│       ├── runtime-resolver.service.ts
│       ├── shared/
│       ├── rdbms/
│       └── nosql/
├── domain/
│   ├── mcp/
│   │   ├── shared/
│   │   ├── rdbms/
│   │   └── nosql/
│   ├── rdbms/
│   └── nosql/
└── infrastructure/
    ├── config/
    ├── rdbms/
    └── nosql/
```

## テスト・品質チェック

```bash
pnpm lint
pnpm build
pnpm test
```

