# Azure App Service用 本番環境Dockerfile
# マルチステージビルドで最適化

# ビルドステージ
FROM node:22-alpine AS builder

# 作業ディレクトリを設定
WORKDIR /app

# pnpmをグローバルインストール
RUN npm install -g pnpm

# package.jsonとpnpm-lock.yamlを先にコピー（キャッシュ効率化）
COPY package.json pnpm-lock.yaml  ./

# 依存関係をインストール（本番用のみ）
RUN pnpm install --frozen-lockfile

# ソースコードをコピー
COPY . .

# TypeScriptをJavaScriptにビルド
RUN pnpm run build

# 本番ステージ
FROM node:22-alpine AS production

# 作業ディレクトリを設定
WORKDIR /app

# pnpmをグローバルインストール
RUN npm install -g pnpm

# package.jsonとpnpm-lock.yamlをコピー
COPY package.json pnpm-lock.yaml  ./

# 本番依存関係のみインストール
RUN pnpm install --frozen-lockfile --prod

# ビルドステージからビルド結果をコピー
COPY --from=builder /app/dist ./dist

# 必要な設定ファイルをコピー（ts-nodeが必要な場合のため）
COPY --from=builder /app/src ./src

# Azure App Serviceのポート設定(環境変数APP_PORTを使用)
EXPOSE 80

# 本番環境での起動コマンド
CMD ["node", "dist/main.js"]