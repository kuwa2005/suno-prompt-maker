# FTP デプロイと認証情報

## セットアップ

1. `cp deploy.env.example deploy.env` し、`FTP_*` を記入（推奨）
2. または `cp deploy-ftp.sh.example deploy-ftp.sh` し、先頭の接続設定を編集
3. `deploy.env` がある場合、その値がスクリプト内のプレースホルダーより優先されます

## コミットしないこと

- `deploy-ftp.sh`（実パスワード入り）
- `deploy.env`

`.gitignore` に登録済みです。**`git add -f deploy-ftp.sh` で強制追加しないでください。**

## パスワード漏洩時

過去にリポジトリへ FTP パスワードがコミットされた履歴がある場合、**サーバー側でパスワードをローテーション（変更）**してください。`.gitignore` だけでは履歴からは消えません（履歴の書き換えが必要な場合は `git filter-repo` 等を別途検討）。
