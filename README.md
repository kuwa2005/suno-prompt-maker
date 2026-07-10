# Suno Prompt Maker

Suno AI 向けのプロンプトメーカー。ブラウザで動く静的 Web アプリです。

## 特徴

- **38カテゴリ**の音楽要素を組み合わせてプロンプトを自動生成
- **64テンプレート**（プロンプト64種 + 歌詞構造15種）
- **重み付きラウンドロビン**でカテゴリごとの出現割合を制御
- **プロンプト生成（ランダム）** / **プロンプト生成(AI)**（スライダー重みを反映）
- **履歴管理**で過去のプロンプトを保存・呼び出し
- **ダーク/ライトモード**対応
- **モバイル対応**（レスポンシブデザイン）
- **ツールチップ**でカテゴリ説明とサンプル候補を表示
- **ラベルクリック**で0%⇔100%切替
- **AI機能**（ternlight WASM）で自然言語から自動設定・セマンティック検索・AIプロンプト生成
- **IndexedDB** にタグ埋め込みベクトルをキャッシュ（初回構築後は高速起動）

## AI機能（ternlight）

### 自動セッティング
「(AI) メインプロンプトから反映」で、メインプロンプトの意味に基づいてカテゴリの%を自動調整します。

**例:**
- 「お洒落なカフェで流れるチルい曲」→ カフェラウンジ系のカテゴリが自動設定
- 「激しいメタル」→ ヘヴィメタル系のカテゴリが自動設定

### プロンプト生成(AI)
メインプロンプトとスライダー重みをもとに、セマンティック検索でタグを選び文字数上限内にプロンプトを組み立てます。スライダーがすべて0%のときは空のプロンプトを出力します。

### セマンティック検索
各カテゴリの「🔍 候補を絞り込む」で、意味ベースの検索が可能です。

### 履歴検索
履歴タブで「🔍 履歴を検索」から、過去のプロンプトを意味ベースで検索できます。

### キャッシュ再構築
設定（About）タブから IndexedDB のタグインデックスキャッシュを削除・再構築できます。`data.js` を更新したあとに実行するとよいです。

### 技術仕様
- `@ternlight/base`（npm）+ Vite で WASM をバンドル
- 全てクライアントサイド完結
- WASM 約 10MB（gzip 約 7MB）、初回はインデックス構築に時間がかかる場合あり
- WASM ロード失敗時はフォールバックモード（簡易類似度）に切り替え
- Chrome Translator API（138+、任意）で日本語入力の精度向上

## カテゴリ一覧

38カテゴリ（詳細は `src/data.js` の `CATEGORIES` / `PROMPT_DATA` を参照）。主な例:

| カテゴリ | 項目数（目安） | 説明 |
|---------|--------|------|
| ジャンル | ~280 | 曲のスタイル分類 |
| スタイル | ~32 | 曲の雰囲気・表現 |
| ムード | ~30 | 曲の感情・気分 |
| 演奏記法 | ~150+ | 楽器の奏法・テクニック |
| LFO | ~250+ | 低周波発振による変調 |
| メジャー/マイナーコード | 110+ | 和音・進行 |
| 演歌（ボーカル） | 100 | 演歌系ボーカル表現 |
| 演歌（曲） | 100 | 伴奏・和声・編曲 |
| … | … | その他ジャンル・質感・季節テーマなど |

## テンプレート

### プロンプトテンプレート（64種）
王道ポップス、バラード、シティポップ、メタル、K-Pop、ボカロ など

### 歌詞構造テンプレート（15種）
王道J-POP、アニメOP、EDM、Vocaloid、Lo-fi など

## 技術スタック

- HTML5 / CSS3 / JavaScript (ES modules)
- **Vite 6**（開発サーバー・本番ビルド）
- **vite-plugin-wasm** / **top-level-await**（ternlight WASM）
- Tailwind CSS（CDN版）+ `public/styles.css`
- **@ternlight/base**（WebAssembly 埋め込み）
- **IndexedDB**（タグインデックスキャッシュ）
- データ: `src/data.js` に集約

## ファイル構成

```
suno-prompt-maker/
├── index.html              # エントリ HTML（Vite が処理）
├── vite.config.js          # Vite 設定（base: /suno-prompt-maker/）
├── package.json
├── public/
│   ├── styles.css          # カスタム CSS
│   └── favicon.ico
├── src/
│   ├── main.js             # エントリ（data → app → ai-init）
│   ├── app.js              # メインロジック・UI
│   ├── data.js             # カテゴリ・テンプレートデータ
│   ├── ai-init.js          # AI 初期化・イベント
│   ├── ai-prompt-generator.js  # AI プロンプト生成
│   ├── ternlight-engine.js # ternlight ラッパー
│   ├── tag-index.js        # タグベクトルインデックス
│   ├── tag-index-db.js     # IndexedDB キャッシュ
│   ├── semantic-search.js
│   ├── auto-setter.js
│   └── history-search.js
├── dist/                   # ビルド成果物（gitignore）
├── deploy-ftp.sh.example   # FTP デプロイテンプレート
└── README.md
```

## 開発

```bash
npm install
npm run dev      # http://localhost:3000 （開発）
npm run build    # dist/ を生成
npm run preview  # ビルド結果のプレビュー
npm run check    # src/*.js の構文チェック
```

本番と同じパスで試す場合は `vite.config.js` の `base: '/suno-prompt-maker/'` に合わせてプレビューします。

## 使い方

1. `npm run dev` またはビルド後の `dist/` をブラウザで開く
2. 「メインプロンプト」に追加の指示を入力（任意）
3. 「(AI) メインプロンプトから反映」で自然言語から自動設定（任意）
4. 「要素の割合」でカテゴリごとの出現率を調整
5. 「プロンプト生成（ランダム）」または「プロンプト生成(AI)」をクリック
6. 生成されたプロンプトをコピーして Suno に貼り付け

### ショートカット
- **ラベルクリック**: 0% ⇔ 100% に切替
- **テンプレート**: クリックでコピー + 自動適用
- **プリセット**: ドロップダウンから雰囲気を選択

## デプロイ

```bash
npm run build
# deploy-ftp.sh を deploy-ftp.sh.example から作成・編集（リポジトリ非コミット）
./deploy-ftp.sh
./deploy-ftp.sh --dry-run   # 確認のみ
```

FTP スクリプトは **`dist/`** の内容をアップロードします。

## カテゴリ追加方法

`src/data.js` の2箇所を編集:

```js
// 1. CATEGORIES に追加
newCategory: {
  name: 'カテゴリ名',
  label: 'スライダー表示名',
  desc: '説明文',
  dataKey: 'newCategory',
  defaultWeight: 0,
},

// 2. PROMPT_DATA に配列追加
newCategory: ['item1', 'item2', ...],
```

追加後は About タブの「タグインデックスキャッシュを再構築」を実行するか、ブラウザの IndexedDB をクリアしてください。

## 開発履歴

### v1.2.0 (2026-07-10)
- Vite + WASM による ternlight 本格統合
- IndexedDB タグインデックスキャッシュ
- プロンプト生成(AI)（重み付き）・UI 改善（About、キャッシュ再構築、技術リンク）
- FTP デプロイを `dist/` ベースに変更

### v1.1.0 (2026-07-07)
- ternlight AI機能統合
- 自動セッティング・セマンティック検索・履歴検索
- 演歌カテゴリ追加 など

### v1.0.0 (2026-07-07)
- 初期リリース

## ライセンス

MIT License
