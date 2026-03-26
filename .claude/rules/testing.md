# テスト規約

## 配置

- `tests/` ディレクトリに `src/` 構造をミラーして配置する
- ファイル名: `*.test.ts`

## ツール

- Jest 30 + ts-jest

## 実行

```bash
pnpm test                    # 全テスト
pnpm test:coverage           # カバレッジ付き
pnpm test -- --testPathPattern=tests/application/mcp/tools/read-query  # 単一
```

## 方針

- コード修正後は必ず `pnpm lint && pnpm build && pnpm test` を全て実行する
- DB アダプターのテストは実際の接続を使う（モック禁止）
- ツール (`McpToolWithDefinition`) のテストは execute() の入出力を検証する
- エラーケース（DB接続失敗、不正入力など）も必ずテストする
