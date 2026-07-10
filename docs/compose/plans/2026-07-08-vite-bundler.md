## ステータス

**完了（2026-07-10）** — `feature/vite-wasm` で Vite 6、`src/` 構成、`@ternlight/base` WASM バンドル、IndexedDB タグキャッシュ、FTP は `dist/` 転送に更新済み。

# Vite バンドラー導入計画

## 目標
ternlight を本格的に活用するため、Vite をバンドラーとして導入

## 変更内容

### 1. ファイル構成の変更
```
現在:
index.html
app.js
data.js
styles.css

変更後:
index.html          # エントリーポイント
src/
  main.js           # app.js をリネーム
  data.js           # データ定義
  styles.css        # カスタムCSS
dist/               # ビルド成果物（gitignore）
  index.html
  assets/
```

### 2. Vite 設定
- `vite.config.js` を作成
- WASM ファイルの扱いを設定
- Tailwind CSS の統合

### 3. ternlight の統合
- `@ternlight/base` を npm でインストール
- WASM ファイルを適切にバンドル
- セマンティック埋め込みを本格使用

### 4. ビルド手順
```bash
npm run build    # ビルド
npm run preview  # プレビュー
```

### 5. デプロイスクリプトの更新
- ビルド後に FTP 転送

## 影響
- ビルド工程が追加
- デプロイ手順が変更
- ternlight の高精度埋め込みが利用可能に
