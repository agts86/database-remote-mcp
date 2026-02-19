# DataBase Remote MCP プロジェクト 設計原則・コーディング規約指示書

## 1. アーキテクチャ層分離の原則

### ✅ やるべきこと

**Domain層（src/domain/）**

- ビジネスロジックに関する純粋なTypeScriptインターフェース・型定義のみ配置
- 外部依存関係を一切持たない
- インターフェース名は`I`プレフィックスを付ける（例：`IMcpRepository`）
- ドメインエンティティの型定義は機能別にフォルダ分割（例：`mcp/`）

**Application層（src/application/）**

- ビジネスロジックの実装とオーケストレーション
- Domainインターフェースに依存し、Infrastructureを注入で受け取る
- `@Injectable()`デコレータを必須とする
- 1クラス1責任の原則を守る

**Infrastructure層（src/infrastructure/）**

- 外部システム（HTTP、データベース、ファイルシステム）との実際の通信
- Domainのインターフェースを実装する
- 設定管理・HTTP クライアント等の技術的関心事を配置
- **リポジトリパターン**: Domain層でインターフェースを定義し、Infrastructure層で`implements`により実装する

**Presentation層（src/presentation/）**

- HTTP エンドポイント・ガード・インターセプターなど
- アプリケーション層のサービスを呼び出すのみ
- リクエスト/レスポンスの変換ロジックのみ含む

### ❌ やってはいけないこと

- Domain層にNestJSのデコレータを使用する
- Presentation層に直接Infrastructure層を注入する
- Application層でHTTPクライアントを直接使用する
- 層を跨いだ直接的な依存関係を作る

## 2. 型定義の配置ルール

### ✅ やるべきこと

```typescript
// Domain層での型定義例
// src/domain/rdbms/mcp/tool-response.interface.ts
export interface ToolResponse {
  content: Array<ToolContent>;
}

// src/domain/rdbms/database/database-adapter.interface.ts
export interface IDatabaseAdapter {
  init(): Promise<void>;
  all(sql: string, params: unknown[]): Promise<QueryResultRow[]>;
  run(
    sql: string,
    params: unknown[],
  ): Promise<{ changes: number; lastID?: number }>;
  close(): Promise<void>;
}

// Application層での拡張型定義例
// src/application/rdbms/mcp/tools/read-query.tool.ts
export interface ReadQueryArguments {
  query: string;
}
```

- **基本型**: `src/domain/` に配置
- **API入出力型**: Application層のサービスファイル内で定義
- **HTTP特化型**: Presentation層で定義
- **外部API型**: Domain層の該当機能フォルダに配置（例：`src/domain/rdbms/mcp/`）

### ❌ やってはいけないこと

- 同じ型定義を複数ファイルで重複定義する
- Presentation層固有の型をDomain層に配置する
- 型定義ファイルに実装コードを含める

## 3. インターフェース設計の原則

### ✅ やるべきこと

```typescript
// 正しいインターフェース定義
// src/domain/rdbms/mcp/tools/tool.interface.ts
export interface McpTool<Input = unknown, Output = unknown> {
  readonly name: string;
  execute(input: Input): Promise<Output>;
}

// src/domain/rdbms/mcp/tools/tool-definition.interface.ts
export interface McpToolWithDefinition<
  Input = unknown,
  Output = unknown,
> extends McpTool<Input, Output> {
  getDefinition(): McpToolDefinition;
}

// ジェネリクスで型安全性を確保
export interface McpMethodHandler<Params = unknown, Response = unknown> {
  readonly method: string;
  handle(message: McpMessage<Params>): Promise<Response> | Response;
}
```

- ジェネリクス型パラメータで再利用性を高める
- メソッドの戻り値は必ず型指定する
- `readonly`で不変性を明示する
- 非同期処理は必ず`Promise<T>`を返す

### ❌ やってはいけないこと

- `any`型を使用する
- 戻り値型を省略する
- オプショナルパラメータの濫用

## 4. メソッドの戻り値型必須化

### ✅ やるべきこと

```typescript
// 明示的な戻り値型指定
// src/application/rdbms/mcp/mcp.service.ts
async executeToolByName(
  toolName: string,
  input: Record<string, unknown>
): Promise<ToolResponse> {
  const tool = this.getToolByName(toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  return await tool.execute(input);
}

// void戻り値も明示
private createMethodNotFoundError(
  messageId: string | undefined,
  method: string
): never {
  throw new Error(`Method not found: ${method}`);
}
```

- すべてのメソッドで戻り値型を明示的に指定
- `Promise<T>`、`unknown`、`void`、`never`を適切に使い分ける
- 例外を投げる場合は`never`型を使用

### ❌ やってはいけないこと

- 戻り値型の推論に頼る
- `any`を戻り値型にする

## 5. 共通型の再利用ルール

### ✅ やるべきこと

```typescript
// 基底型の拡張で共通性確保
// src/domain/rdbms/mcp/tools/database-tools.interface.ts
export interface ReadQueryArguments {
  query: string;
}
export interface WriteQueryArguments {
  query: string;
}
export interface ExportQueryArguments {
  query: string;
  format: 'csv' | 'json';
}

// ユニオン型で共通インターフェース
type DatabaseTools =
  | ReadQueryTool
  | WriteQueryTool
  | ExportQueryTool
  | ListTablesTool;

// 共通レスポンス型の統一
export interface McpResponse<T = unknown> {
  jsonrpc: '2.0';
  id?: string;
  result?: T;
}
```

- 既存の型を`extends`で拡張する
- 共通パターンは基底インターフェースとして抽出
- ジェネリクス型で再利用性を確保

### ❌ やってはいけないこと

- 同様の構造の型を重複定義する
- 特化型のために基底型を変更する

## 6. DIとクラス設計のガイドライン

### ✅ やるべきこと

```typescript
// Domain層: インターフェース定義
// src/domain/rdbms/database/database-adapter.interface.ts
export interface IDatabaseAdapter {
  init(): Promise<void>;
  all(sql: string, params: unknown[]): Promise<QueryResultRow[]>;
  run(
    sql: string,
    params: unknown[],
  ): Promise<{ changes: number; lastID?: number }>;
  close(): Promise<void>;
}

// Infrastructure層: インターフェース実装
// src/infrastructure/rdbms/adapters/sqlserver-adapter.ts
@Injectable()
export class SqlServerAdapter implements IDatabaseAdapter {
  constructor(private readonly config: SqlServerConnectionConfig) {}

  async init(): Promise<void> {
    // データベース接続の初期化
  }
}

// Application層: サービス実装
// src/application/rdbms/mcp/tools/read-query.tool.ts
@Injectable()
export class ReadQueryTool implements McpToolWithDefinition<
  ReadQueryArguments,
  ToolResponse
> {
  constructor(private readonly appConfigProvider: AppConfigProvider) {}
}
```

- **リポジトリパターン**: Domain層でインターフェース定義、Infrastructure層で実装
- コンストラクタ注入を使用する
- `readonly`修飾子でイミュータブル性を保つ
- 依存性は抽象（インターフェース）に対して行う

### ❌ やってはいけないこと

- `@Inject()`を多用する（型で解決できる場合）
- コンストラクタ内で複雑な初期化ロジックを書く
- サービス内でnewによる直接インスタンス化

## 7. エラーハンドリングのパターン

### ✅ やるべきこと

```typescript
// データベースツールでのエラーハンドリング例
// src/application/rdbms/mcp/tools/read-query.tool.ts
async execute(args: ReadQueryArguments): Promise<ToolResponse> {
  try {
    const connectionConfig = this.appConfigProvider.getDefaultDatabaseConfig();
    const adapter = DatabaseAdapterFactory.create(connectionConfig);
    await adapter.init();

    const results = await adapter.all(args.query, []);

    await adapter.close();

    return {
      content: [
        {
          type: 'text',
          text: `Query results: ${JSON.stringify(results, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing query: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}
```

- エラー名（`error.name`）でエラー種別を判定
- ログ出力とスタックトレース保持を徹底
- HTTP レスポンスでの適切なステータスコード設定
- `unknown`型でエラーを受け取り、型ガードで安全に処理

### ❌ やってはいけないこと

- エラーを握り潰す
- `console.log`の使用（Loggerを使用）
- 汎用的すぎるエラーメッセージ
- エラーオブジェクトの構造を前提とした処理

## 8. ファイル命名・インポートの規則

### ✅ やるべきこと

```typescript
// .js拡張子でのインポート（ESM準拠）
// src/application/rdbms/mcp/mcp.service.ts
import { Injectable } from '@nestjs/common';
import { ReadQueryTool } from './tools/read-query.tool.js';
import { WriteQueryTool } from './tools/write-query.tool.js';
import { ExportQueryTool } from './tools/export-query.tool.js';
import { ListTablesTool } from './tools/list-tables.tool.js';

// インターフェースはtypeインポートを使用
import type { McpToolWithDefinition } from '../../../domain/rdbms/mcp/tools/tool-definition.interface.js';
import type { ToolResponse } from '../../../domain/rdbms/mcp/tool-response.interface.js';
```

- ファイル拡張子は`.ts`だがインポート時は`.js`
- 型のみのインポートは`import type`を使用
- ファイル名は機能を明確に表現（例：`mcp-message.interface.ts`）

### ❌ やってはいけないこと

- インポート文での`.ts`拡張子指定
- デフォルトエクスポートの濫用
- 相対パス（`../`）の深いネスト（3階層まで）

## 9. TypeScript設定の遵守

### ✅ やるべきこと

- `noImplicitAny: true` - 暗黙的any型を禁止
- `strict: true` - 厳密な型チェック
- 明示的な型注釈を必須とする

### ❌ やってはいけないこと

- 型推論に頼った`any`の発生を許可
- `@ts-ignore`の使用
- 型安全性を犠牲にした実装

## 10. コード複雑度管理の原則

### ✅ やるべきこと

- **循環的複雑度を10以下に保つ**: 関数・メソッドの循環的複雑度（Cyclomatic Complexity）は必ず10以下にする
- **複雑になる場合は相談**: 実装が複雑度10を超えそうな場合は、事前に設計を相談する
- **関数の分割**: 複雑な処理は小さな関数に分割して可読性を向上させる
- **早期リターン**: ネストを減らすため、条件チェックでの早期リターンを活用する

```typescript
// ✅ 良い例：複雑度が低く、早期リターンを使用
// src/application/rdbms/mcp/mcp.service.ts
async executeToolByName(toolName: string, params: unknown): Promise<ToolResponse> {
  if (!toolName) {
    throw new Error('Tool name is required');
  }

  const tool = this.getToolByName(toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  return await tool.execute(params);
}

private getToolByName(toolName: string): McpToolWithDefinition | undefined {
  const tools = [this.readQueryTool, this.writeQueryTool, this.exportQueryTool, this.listTablesTool];
  return tools.find(tool => tool.name === toolName);
}

// ❌ 悪い例：ネストが深く複雑度が高い
async processComplexLogic(data: unknown): Promise<unknown> {
  if (data) {
    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        // ... 深いネスト構造
      } else {
        // ... さらに複雑な処理
      }
    }
  }
  // 複雑度が10を超える可能性がある
}
```

### ❌ やってはいけないこと

- `switch`文の使用
- 既存の`switch`文を`if`文に書き換える行為
- 循環的複雑度10を超える関数・メソッドの実装
- 相談なしで複雑な制御フローを持つコードの作成
- 深いネスト（3階層を超える`if`文など）
- 1つのメソッドに複数の責任を持たせること

### 🤔 複雑度が10を超えそうな場合の対処

1. **事前相談**: 実装前に設計アプローチを相談する
2. **処理分割**: 複雑な処理を複数のメソッドに分割する
3. **パターン適用**: Strategy パターンや State パターンなどの適用を検討する
4. **リファクタリング**: 既存コードが複雑になった場合は積極的にリファクタリングする

## 11. 品質保証・テストの原則

### ✅ やるべきこと

- **作業後の必須確認**: コード修正後は必ずビルドとテストを実行して動作確認を行う
- **ビルド確認**: `pnpm build` または `tsc --noEmit` でTypeScriptコンパイルエラーがないことを確認
- **テスト実行**: `pnpm test` で全テストが通ることを確認
- **継続的な品質維持**: 新機能追加時、既存コード修正時、リファクタリング時は必ず確認

```bash
# 必須の確認手順
pnpm lint     # ESLintによるコード品質チェック
pnpm build    # TypeScriptコンパイルの確認
pnpm test     # 全テストの実行確認

# オプション: カバレッジ確認
pnpm test:coverage  # テストカバレッジの確認
```

- **エラー発生時の対応**: ビルドエラーやテスト失敗時は必ず修正してから作業完了とする
- **デグレーション防止**: 既存機能に影響がないことを必ず確認する

### ❌ やってはいけないこと

- ビルドやテスト実行をせずに作業完了とする
- ビルドエラーやテスト失敗を残したままコミットする
- 既存テストを削除・無効化して問題を隠蔽する
- テスト対象外の重要なコード変更を行う

## 12. 設計パターンと複雑度管理の自動適用

### ✅ 自動的に適用すべき設計原則

**Switch文・長い条件分岐の自動リファクタリング:**

- `switch`文や長い`if-else`チェーンを発見した場合、自動的にStrategy パターンまたはポリモーフィズムで置き換える
- 複数の似たような処理がある場合、共通インターフェースを作成してコレクション + `find()` パターンを適用
- 新しい分岐追加時の影響範囲を最小化する設計を優先

**複雑度の自動監視と対処:**

- メソッドの循環的複雑度が6を超えた時点で分割を検討
- ネストが2階層を超えた場合、早期リターンパターンを適用
- 1つのクラス/ファイルで複数の責任を持っている場合、自動的に分離を提案

**パターン適用の優先順位:**

1. **Strategy パターン**: 同種の処理で実装が異なる場合
2. **Factory パターン**: 条件によってインスタンス生成が分岐する場合
3. **Collection + find**: 名前や条件での検索が必要な場合
4. **Template Method**: 処理の流れは同じで一部だけ異なる場合

### 🤖 自動判断基準

**即座にリファクタリング提案する条件:**

- `switch (type/name)` パターンを発見
- 同じような`if (name === 'xxx')` が3つ以上
- メソッド内の`if`ネストが3階層以上
- 1つのメソッドが50行を超える

**設計時の自動考慮事項:**

- 「将来この処理に似たものが増える可能性は？」→インターフェース化
- 「この分岐は今後増える可能性は？」→Strategy パターン適用
- 「このメソッドは複数の責任を持っていないか？」→分割検討

### 📝 自動提案のテンプレート

```typescript
// ❌ 自動検出対象（複雑度高）
switch (toolName) {
  case 'read_query': /* 処理 */ break;
  case 'write_query': /* 処理 */ break;
  case 'export_query': /* 処理 */ break;
  case 'list_tables': /* 処理 */ break;
  // 4つ以上で自動提案
}

// ✅ 実際の実装パターン（src/application/rdbms/mcp/mcp.service.ts）
private getToolByName(toolName: string): McpToolWithDefinition | undefined {
  const tools = [
    this.readQueryTool,
    this.writeQueryTool,
    this.exportQueryTool,
    this.listTablesTool
  ];
  return tools.find(tool => tool.name === toolName);
}

async executeToolByName(toolName: string, params: unknown): Promise<ToolResponse> {
  const tool = this.getToolByName(toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  return await tool.execute(params);
}
```

## 13. コミュニケーションの原則

### ✅ やるべきこと

- **日本語での回答**: すべての説明・コメント・回答は日本語で行う
- **丁寧な説明**: 技術的な内容も分かりやすく日本語で説明する
- **コードコメント**: 日本語でのコメント記述を推奨

### ❌ やってはいけないこと

- 英語での回答や説明
- 専門用語の英語表記のみでの説明

## 14. コード品質チェック・開発フロー

### ✅ 必須の開発フロー

**コード修正後の必須チェック**

```bash
# 1. ESLintによるコード品質チェック（必須）
pnpm lint

# 2. ビルドチェック（必須）
pnpm build

# 3. テスト実行（必須）
pnpm test
```

**ESLint設定による自動品質管理**

- 循環複雑度は10以下を維持
- `any`型の使用を禁止
- 明示的な関数戻り値型を必須
- 型安全なテンプレートリテラル使用
- 適切な型インポート（`import type`）を強制

### ❌ やってはいけないこと

- ESLintエラーが残った状態でコミット
- `pnpm lint`、`pnpm build`、`pnpm test`を実行せずに修正完了とする
- ビルドエラーやテスト失敗が残った状態でコミット
- ESLintルールを無視する修正

**AI向け特記事項（手順省略の禁止）**

- **手順の省略**: 「面倒だから」「時間がかかるから」という理由でルールを無視する
- **勝手な判断**: 「小さな修正だから大丈夫だろう」と自己判断して必須チェックを省略する
- **楽をしようとする**: AIに疲労はないので、確実にすべての手順を実行する
- **「どうせ動く」という慢心**: 動作確認は必ず行う
- **ルールの軽視**: 「必須」と書かれた項目を無視する

---

**重要**: この指示書に従って開発を行うことで、保守性が高く一貫性のあるコードベースを維持できます。新機能追加時や既存コード修正時は、必ずこれらの原則に従って実装し、**必ず`pnpm lint`、`pnpm build`、`pnpm test`の順序で3つすべてを実行して品質チェックを行ってください**。
