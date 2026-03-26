# API・アーキテクチャ規約

## レイヤー依存方向

```
Presentation → Application → Domain ← Infrastructure
```

- Domain 層: 純粋な TS 型・インターフェースのみ。外部依存禁止、NestJS デコレータ禁止
- Application 層: ユースケース、DB 操作の調整
- Infrastructure 層: DB アダプター実装
- Presentation 層: HTTP コントローラー（HTTP モードのみ）

## MCPツール実装

`McpToolWithDefinition<Input, Output>` を実装する:

```typescript
readonly name = 'tool_name'
getDefinition(): ZodSchema  // Zod スキーマを返す
execute(args): Promise<ToolResponse>  // エラーは throw せず ToolResponse で返す
```

## データベースアダプター

- Factory + Strategy パターンを使う
- 新 DB タイプ追加: 契約 (Domain) → アダプター (Infrastructure) → Factory 戦略の順に追加

## エンドポイント

| パス | 説明 |
|------|------|
| `POST /mcp` | 標準 HTTP MCP (JSON-RPC) |
| `POST /mcp/stream` | Streamable HTTP |

## 環境変数

- `MCP_TRANSPORT`: `http`（デフォルト）または `stdio`
- `DB_TYPE`: `sqlserver` / `postgres` / `mysql` / `mongodb`
- `ENABLED_TOOLS`: 有効にする RDBMS ツール名（カンマ区切り）
- `ENABLED_NOSQL_TOOLS`: 有効にする NoSQL ツール名（カンマ区切り）
