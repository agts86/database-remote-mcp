# コードスタイル規約

## 型安全

- `any` 禁止 → `unknown` + 型ガードを使う
- 戻り値型は必ず明示する（型推論に頼らない）
- 型のみのインポートは `import type` を使う

## インポート

- ESM インポート: 拡張子は `.js` 必須（`.ts` ではない）
- 例: `import { Foo } from './foo.js'`

## 命名規則

- インターフェース: `I` プレフィックス（例: `IDatabaseAdapter`）
- ファイル名: kebab-case

## 複雑度・構造

- 循環的複雑度: 10 以下（6 超で分割検討）
- ネスト: 最大 3 階層
- 関数: 50 行以下
- `switch` 文禁止 → Strategy / Collection + find パターンを使う

## その他

- `console.log` 禁止 → NestJS `Logger` を使う
- `@ts-ignore` 禁止
- シングルクォート、2 スペースインデント、LF 改行
