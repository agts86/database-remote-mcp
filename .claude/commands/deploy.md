# /project:deploy

デプロイ前のチェックと手順を案内する。

## 手順

1. `pnpm lint && pnpm build && pnpm test` を実行して全て通ることを確認する
2. `git status` で未コミットの変更がないことを確認する
3. Docker イメージのビルドを確認する:
   ```bash
   docker build -f Dockerfile -t database-remote-mcp:latest .
   ```
4. 環境変数が設定されていることを確認する（DB_TYPE, DB_HOST, etc.）
5. デプロイコマンドを実行する
