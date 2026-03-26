# デプロイ スキル

このスキルはデプロイ前チェックからコンテナビルドまでのワークフローを実行する。

## 実行手順

1. **品質チェック**
   ```bash
   pnpm lint && pnpm build && pnpm test
   ```

2. **未コミット変更の確認**
   ```bash
   git status
   ```

3. **Docker イメージビルド**
   ```bash
   docker build -f Dockerfile -t database-remote-mcp:latest .
   ```

4. **動作確認**（HTTP モード）
   ```bash
   docker run --rm \
     -e DB_TYPE=postgres \
     -e DB_HOST=<host> \
     -p 3000:3000 \
     database-remote-mcp:latest
   ```

5. 全ステップが成功したらデプロイ完了を報告する
