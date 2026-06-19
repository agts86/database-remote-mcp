# DataBase Remote MCP Server

リモートデータベースへのアクセス機能を Model Context Protocol (MCP) ツールとして公開するサーバーです。**HTTP** と **stdio** の両トランスポートに対応しています。

## 概要

- `MCP_TRANSPORT` 環境変数でトランスポートを切替
  - 未設定 / `http` → HTTP サーバーモード（`/mcp`, `/mcp/stream`）
  - `stdio` → stdin/stdout MCP プロトコルモード
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

- Node.js >= 24
- pnpm 推奨

## 起動

```bash
pnpm install
pnpm build
pnpm start          # HTTPモード（デフォルト）
```

stdioモード:

```bash
MCP_TRANSPORT=stdio pnpm start
```

開発モード（HTTP）:

```bash
pnpm start:dev
```

## MCP クライアント設定例

### stdio

#### Claude Code / Claude Desktop

**Claude Code** — グローバル登録（全プロジェクトで利用可能）:

```bash
claude mcp add database-remote-mcp --scope user -e MCP_TRANSPORT=stdio -- \
  node --env-file=/path/to/database-remote-mcp/.env /path/to/database-remote-mcp/dist/main.js
```

**Claude Code** — プロジェクトローカル（`.mcp.json`）:

```json
{
  "mcpServers": {
    "database-remote-mcp": {
      "command": "node",
      "args": [
        "--env-file=/path/to/database-remote-mcp/.env",
        "/path/to/database-remote-mcp/dist/main.js"
      ],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

**Claude Desktop** — `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "database-remote-mcp": {
      "command": "node",
      "args": [
        "--env-file=/path/to/database-remote-mcp/.env",
        "/path/to/database-remote-mcp/dist/main.js"
      ],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

#### Codex

`~/.codex/config.toml`:

```toml
[mcp_servers.database-remote-mcp]
command = "node"
args = [
  "--env-file=/path/to/database-remote-mcp/.env",
  "/path/to/database-remote-mcp/dist/main.js"
]

[mcp_servers.database-remote-mcp.env]
MCP_TRANSPORT = "stdio"
```

#### GitHub Copilot（VS Code）

`.vscode/mcp.json`:

```json
{
  "servers": {
    "database-remote-mcp": {
      "type": "stdio",
      "command": "node",
      "args": [
        "--env-file=/path/to/database-remote-mcp/.env",
        "/path/to/database-remote-mcp/dist/main.js"
      ],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

### HTTP

#### Claude Code / Claude Desktop

**Claude Code** — グローバル登録:

```bash
claude mcp add database-remote-mcp --scope user --transport http \
  http://localhost:3000/mcp/stream
```

**Claude Desktop** — `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "database-remote-mcp": {
      "type": "http",
      "url": "http://localhost:3000/mcp/stream"
    }
  }
}
```

#### Codex

`~/.codex/config.toml`:

```toml
[mcp_servers.database-remote-mcp]
url = "http://localhost:3000/mcp/stream"
enabled = true
```

#### GitHub Copilot（VS Code）

`.vscode/mcp.json`:

```json
{
  "servers": {
    "database-remote-mcp": {
      "type": "http",
      "url": "http://localhost:3000/mcp/stream"
    }
  }
}
```

## 環境変数

`.env.sample` を `.env` にコピーして設定します。

### 共通

```env
APP_PORT=3000          # HTTPモードのみ使用
ALLOWED_ORIGINS=
DB_TYPE=postgres
MCP_TRANSPORT=         # 未設定またはhttp=HTTPモード / stdio=stdioモード
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
├── app.module.ts          # HTTPモード用ルートモジュール
├── app-stdio.module.ts    # stdioモード用ルートモジュール（Presentation層なし）
├── presentation/          # HTTPモードのみ使用
│   └── mcp/
│       ├── mcp.controller.ts
│       ├── mcp.controller.module.ts
│       └── sse.interceptor.ts
├── application/
│   └── mcp/
│       ├── mcp.service.ts
│       ├── runtime-resolver.service.ts
│       ├── shared/           # connectStdio() を含む共通実装
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

