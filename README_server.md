# TOKYO ROZE 管理システム

TOKYO ROZE（tokyoroze.com）の管理サーバーシステムです。
SNS自動投稿・ブログ管理・キャスト管理をExpressサーバーベースで提供します。

## セットアップ

```bash
npm install
```

`.env` ファイルにAPIキーを設定（管理画面の設定タブからも変更可能）

```bash
npm run server
```

## アクセス

| 画面 | URL |
|------|-----|
| LP | http://localhost:3000 |
| 管理画面 | http://localhost:3000/admin.html |

初期パスワード: `changethispassword`（ログイン後すぐに変更してください）

## APIキーの取得方法

| サービス | 取得先 |
|---------|--------|
| Anthropic (Claude) API | https://console.anthropic.com |
| X (Twitter) API | https://developer.x.com |
| Telegram Bot | TelegramでBotFatherに `/newbot` |
| GitHub Token | https://github.com/settings/tokens |

## API エンドポイント一覧

### 認証・設定 (`/api/auth`)
| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/auth/login` | ログイン |
| POST | `/api/auth/change-password` | パスワード変更 |
| GET | `/api/auth/settings` | 設定取得（マスク表示） |
| POST | `/api/auth/settings` | 設定保存 |
| POST | `/api/auth/settings/test` | 接続テスト |

### キャスト管理 (`/api/cast`)
| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/cast` | 新規キャスト登録 |
| GET | `/api/cast` | キャスト一覧 |
| GET | `/api/cast/:id` | キャスト詳細 |
| PUT | `/api/cast/:id` | キャスト更新 |
| DELETE | `/api/cast/:id` | キャスト削除 |
| PUT | `/api/cast/:id/status` | 出勤ステータス変更 |
| POST | `/api/cast/:id/announce` | 新人入店お知らせ投稿 |

### SNS投稿 (`/api/sns`)
| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/sns/generate` | 週間投稿自動生成 |
| POST | `/api/sns/post` | 一括投稿 |
| POST | `/api/sns/manual` | 手動投稿（画像対応） |
| POST | `/api/sns/template` | テンプレート投稿 |
| POST | `/api/sns/draft` | 下書き保存 |
| GET | `/api/sns/drafts` | 下書き一覧 |
| GET | `/api/sns/history` | 投稿履歴 |

### ブログ (`/api/blog`)
| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/blog/generate` | 記事自動生成 |
| POST | `/api/blog/publish` | 記事公開 |
| POST | `/api/blog/manual` | 手動記事公開 |
| GET | `/api/blog/list` | 記事一覧 |
| DELETE | `/api/blog/:slug` | 記事削除 |

## SNSテンプレートタイプ

`POST /api/sns/template` の `type` パラメータ:

- `daily_schedule` — 本日の出勤
- `new_cast` — 新人入店
- `campaign` — キャンペーン
- `review` — 口コミ紹介
- `weekend` — 週末の空き
- `cast_return` — キャスト復帰
- `ranking` — 月間ランキング
- `announcement` — 営業告知

## フォルダ構成

```
├── server.js           # Expressサーバー
├── .env                # 環境変数（APIキー等）
├── routes/
│   ├── auth.js         # 認証・設定API
│   ├── cast.js         # キャスト管理API
│   ├── sns.js          # SNS投稿API
│   └── blog.js         # ブログ管理API
├── services/
│   ├── claude.js       # Claude AI（投稿文生成・翻訳）
│   ├── twitter.js      # X(Twitter) 投稿
│   ├── telegram.js     # Telegram投稿
│   └── github.js       # GitHub連携（ブログデプロイ）
├── public/
│   ├── index.html      # LP
│   ├── admin.html      # 管理画面
│   └── images/         # 画像
├── data/
│   ├── casts.json      # キャストデータ
│   ├── posts-history.json  # 投稿履歴
│   └── drafts.json     # 下書き
├── uploads/            # アップロード画像
└── blog/               # ブログ記事HTML
```
