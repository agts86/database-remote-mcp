# /project:review

変更されたファイルのコードレビューを行う。

## 手順

1. `git diff` で変更内容を確認する
2. 以下の観点でレビューする:
   - CLAUDE.md のコーディング規約への準拠（`any`禁止、戻り値型明示、etc.）
   - テストの網羅性
   - セキュリティリスク（SQLインジェクション、入力検証など）
   - アーキテクチャの依存方向（Presentation → Application → Domain ← Infrastructure）
3. 問題点と改善提案をリスト形式で報告する
