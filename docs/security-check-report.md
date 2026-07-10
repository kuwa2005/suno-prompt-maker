# セキュリティチェックレポート

実施日: 2026-07-10

## 1. リポジトリ内の機密文字列スキャン

`git grep`（`node_modules` 除外）で以下を検索:

- `FTP_PASS`, `password`, `api_key`, `secret`, `bbCE5`, `b45.coreserver.jp`, `coreserver`

**結果:** 追跡ファイルに実パスワード・本番ホストのハードコードはなし。  
ヒットは `deploy-ftp.sh.example` / `deploy.env.example` のプレースホルダーと、ソース内の `enTokens` 変数名のみ。

## 2. デプロイ認証ファイルの Git 管理

| ファイル | 追跡 | `.gitignore` |
|----------|------|--------------|
| `deploy-ftp.sh` | いいえ | あり |
| `deploy.env` | いいえ | あり |
| `deploy-ftp.sh.example` | はい（プレースホルダーのみ） | — |
| `deploy.env.example` | はい（テンプレート） | — |

`git check-ignore` でローカルの `deploy-ftp.sh` / `deploy.env` が無視されることを確認。

## 3. ビルド成果物 `dist/`

`npm run build` 後、`dist/` 内を `FTP_PASS`, 既知ホスト名, パスワードパターンで検索。

**結果:** 機密文字列なし（ビルド成果物に FTP 設定は含まれない）。

## 4. `src/` のハードコード秘密情報

`src/` 全体を同様のパターンで検索。

**結果:** 機密情報なし。

## 5. 推奨事項

1. `deploy-ftp.sh` / `deploy.env` を `git add -f` しない。
2. 過去に履歴へ漏れた場合は FTP パスワードをローテーションする（手順: `docs/deploy-credentials.md`）。
3. CI で `npm test` と本レポート相当の `git grep` を定期実行することを推奨。

## 6. 自動テスト

`npm test` = Node ユニットテスト（回帰含む）。`npm run test:e2e` = Playwright（プレビューサーバー上で UI / WASM 読み込み確認）。

**2026-07-10 再スキャン:** `npm run build` 後の `dist/` に FTP/パスワード文字列なしを確認。
