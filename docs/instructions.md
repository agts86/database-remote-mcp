# DataBase Remote MCP プロジェクト 設計原則・コーディング規約指示書

## 1. アーキテクチャ原則

依存方向は必ず次を守ること。

`Presentation -> Application -> Domain <- Infrastructure`

### Domain層（`src/domain/`）

- 純粋な TypeScript の型・インターフェースのみを配置する
- 外部ライブラリや NestJS デコレータを持ち込まない
- MCP 依存型と DB 契約を分離する

```text
src/domain/
├── mcp/
│   ├── shared/
│   ├── rdbms/
│   └── nosql/
├── rdbms/
└── nosql/
```

### Application層（`src/application/`）

- ビジネスロジックを実装する
- `@Injectable()` を付与する
- Runtime 切替の分岐は `runtime-resolver.service.ts` に閉じ込める

```text
src/application/mcp/
├── mcp.service.ts
├── runtime-resolver.service.ts
├── shared/
├── rdbms/
└── nosql/
```

### Infrastructure層（`src/infrastructure/`）

- DB ドライバや外部システム接続を担当する
- Domain の契約を実装する
- Factory + Strategy パターンで DB 差分を吸収する

```text
src/infrastructure/
├── config/
├── rdbms/
└── nosql/
```

### Presentation層（`src/presentation/`）

- HTTP エンドポイントとインターセプターのみを持つ
- Application サービス呼び出し以外の処理を持ち込まない
- stdioモード時は使用しない（`AppStdioModule` が Presentation 層を除外する）

```text
src/presentation/mcp/
├── mcp.controller.ts
├── mcp.controller.module.ts
└── sse.interceptor.ts
```

### トランスポートモード

`MCP_TRANSPORT` 環境変数でエントリーポイントの起動モードを制御する。

| `MCP_TRANSPORT` | 動作 |
|---|---|
| 未設定 / `http` | NestJS Fastify HTTPサーバーを起動（`AppModule` 使用） |
| `stdio` | stdin/stdout で MCP プロトコルを処理（`AppStdioModule` 使用）|

- stdioモードでは NestJS ログを完全無効化（`logger: false`）してstdoutを保護する
- stdioモードでは `BaseMcpService.connectStdio()` を呼び出し、`StdioServerTransport` に接続する
- ルートモジュールの使い分け:
  - `AppModule` — HTTPモード（Presentation層含む）
  - `AppStdioModule` — stdioモード（`McpServiceModule` のみ）

## 2. 型定義の配置ルール

- MCP 共通型: `src/domain/mcp/shared/`
- MCP RDBMS ツール引数: `src/domain/mcp/rdbms/rdbms-tools.interface.ts`
- MCP NoSQL ツール引数: `src/domain/mcp/nosql/nosql-tools.interface.ts`
- RDBMS 契約: `src/domain/rdbms/`
- NoSQL 契約: `src/domain/nosql/`

同じ構造の型を複数ファイルに重複定義しないこと。

## 3. MCP 実装ルール

各ツールは `McpToolWithDefinition<Input, Output>` を実装する。

- `readonly name` でツール名を定義
- `getDefinition()` で定義を返却
- `execute(args)` で処理を実行
- ツール内エラーは `ToolResponse` のテキストとして返却（throw しない）

Runtime の責務:

- `RdbmsRuntimeService` / `NoSqlRuntimeService` がツール群を保持
- `McpRuntimeResolverService` が `DB_TYPE` から runtime を選択
- `McpService` が単一エンドポイント用 Facade として委譲

## 4. データベース実装ルール

### RDBMS

- `RdbmsAdapterFactory` で `sqlserver` / `postgres` / `mysql` を切替
- 各アダプターは `IDatabaseAdapter` を実装

### NoSQL

- `NoSqlAdapterFactory` で `mongodb` を切替
- Mongo 実装は `MongoDbAdapter`
- 現状 NoSQL ツールは `list_collections` のみ

## 5. エンドポイント / トランスポート

### HTTPモード（デフォルト）

- `/mcp` (JSON-RPC over HTTP POST、SSEはGETで検出)
- `/mcp/stream` (Streamable HTTP / MCP SDK `StreamableHTTPServerTransport`)

エンドポイントは単一のまま、`DB_TYPE` で runtime を切り替える。

### stdioモード（`MCP_TRANSPORT=stdio`）

HTTPサーバーは起動せず、stdin/stdout を MCP プロトコルで占有する。

- MCP SDK `StdioServerTransport` を使用
- ツール・ランタイムは HTTPモードと共通（`BaseMcpService.connectStdio()` 経由）
- ログ出力は完全無効化（stdoutへの書き込みを防止）
- SIGINT / SIGTERM でグレースフルシャットダウン

## 6. 命名とインポート

- 型のみは `import type` を使う
- ESM インポートでは `.js` 拡張子を付ける
- `any` は使わず `unknown` + 型ガードで扱う
- インターフェースは `I` プレフィックスを付ける

## 7. 品質基準

- 戻り値型は必ず明示する
- 循環的複雑度は 10 以下
- ネストは最大 3 階層
- `switch` を避け、Strategy や `find` で分岐を表現する
- `console.log` ではなく NestJS `Logger` を使う
- `@ts-ignore` は禁止

## 8. テスト方針

- テストは `tests/` に `src/` 構造をミラーして配置
- ファイル名は `*.test.ts`
- コード修正後は必ず次を実行する

```bash
pnpm lint
pnpm build
pnpm test
```

## 9. 変更時チェックリスト

- フォルダ移動時に import パスを全更新したか
- `DB_TYPE` 分岐が resolver 以外に漏れていないか
- ツール定義と実装名が一致しているか
- `.env.sample` と README の設定説明を同期したか
- 新しいトランスポートモードを追加する場合は `AppStdioModule` / `AppModule` の両方で動作確認したか
- stdioモードでは stdout に書き込む処理を追加していないか（`process.stderr.write` を使うこと）

