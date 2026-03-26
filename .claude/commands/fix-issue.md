# /project:fix-issue

GitHub Issue を元に修正を行う。

## 引数

`/project:fix-issue <issue番号またはURL>`

## 手順

1. Issue の内容を確認する（`gh issue view <番号>`）
2. 関連するファイルを特定して読む
3. 修正を実装する
4. `pnpm lint && pnpm build && pnpm test` を実行して全て通ることを確認する
5. 修正内容を説明する
