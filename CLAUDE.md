# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

すべての回答・説明・コメントは日本語で行うこと。コードコメントも日本語を推奨。

## Commands

```bash
pnpm install          # 依存インストール
pnpm build            # ビルド (nest build)
pnpm start            # 起動 (node dist/main.js)
pnpm start:dev        # 開発モード (watch + auto-reload)
pnpm start:debug      # デバッグモード

pnpm test             # テスト実行
pnpm test:coverage    # カバレッジ付きテスト
pnpm test -- --testPathPattern=tests/application/mcp/tools/read-query  # 単一テスト実行

pnpm lint             # ESLint
pnpm lint:fix         # ESLint自動修正
pnpm format           # Prettier整形
pnpm format:check     # Prettier確認
```

**コード修正後は必ず `pnpm lint && pnpm build && pnpm test` の順で3つすべて実行すること。**

## Architecture

NestJS + Fastify + MCP SDK によるリモートDB（SQL Server）アクセスMCPサーバー。

### レイヤー構成（依存方向: Presentation → Application → Domain ← Infrastructure）

```
src/
├── domain/           # 純粋なTS型・インターフェースのみ。外部依存禁止、NestJSデコレータ禁止
├── application/      # ビジネスロジック。@Injectable()必須。Domain依存、Infrastructure注入
│   └── mcp/
│       ├── mcp.service.ts        # ツールオーケストレーター
│       ├── handlers/             # JSON-RPCメソッドハンドラー
│       └── tools/                # MCPツール実装 (11個)
├── infrastructure/   # 外部システム連携。Domainインターフェースを実装
│   ├── config/                   # AppConfigProvider (環境変数管理)
│   └── database/adapters/        # DatabaseAdapterFactory + SqlServerAdapter
└── presentation/     # HTTPエンドポイント。Application層呼び出しのみ
    ├── controllers/mcp/          # MCPコントローラー (/mcp, /mcp/stream)
    └── interceptors/             # SSEインターセプター
```

### MCPツールの実装パターン

各ツールは `McpToolWithDefinition<Input, Output>` を実装する:
- `readonly name` でツール名定義
- `getDefinition()` でZodスキーマ返却
- `execute(args)` でDB操作実行、`ToolResponse` 返却
- エラーはcatchしてToolResponseのtextとして返す（throwしない）

ツールの有効/無効は `ENABLED_TOOLS` 環境変数で制御。

### データベースアダプター

Factory + Strategy パターン。`IDatabaseAdapter` インターフェースをDomain層で定義し、`SqlServerAdapter` がInfrastructure層で実装。新DBタイプ追加時はアダプターとStrategyを追加。

### MCPエンドポイント

- `/mcp` — 標準HTTP MCP (JSON-RPC)
- `/mcp/stream` — Streamable HTTP (MCP SDK StreamableHTTPServerTransport)

## Coding Conventions

- **`any`禁止** — `unknown` を使い型ガードで処理
- **戻り値型は必ず明示** — 推論に頼らない
- **`import type`** — 型のみのインポートに使用
- **ESMインポート** — `.js` 拡張子必須（`.ts`ではない）
- **インターフェース** — `I`プレフィックス（例: `IDatabaseAdapter`）
- **循環的複雑度** — 10以下（6超で分割検討）
- **ネスト** — 最大3階層
- **関数** — 50行以下
- **`switch`文禁止** — Strategy/Collection+findパターンを使う
- **`console.log`禁止** — NestJS `Logger` を使用
- **`@ts-ignore`禁止**
- **フォーマット** — シングルクォート、2スペース、LF改行

## Testing

テストは `tests/` ディレクトリにsrc構造をミラーして配置。Jest 30 + ts-jest使用。
テストファイル名: `*.test.ts`
