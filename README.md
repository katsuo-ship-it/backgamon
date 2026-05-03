# バックギャモン (Backgamon)

ブラウザで遊ぶフル仕様バックギャモン。CPU 対戦、チュートリアル、ストーリー、パズル、4 段階 AI、実績、テーマ切替などを搭載。

**遊ぶ:** [https://backgamon.vercel.app/](https://backgamon.vercel.app/)

## 特徴

| 機能 | 内容 |
|---|---|
| **ゲームモード** | チュートリアル / 練習 / 対局 / ストーリー (6 章) / 今日の局面パズル |
| **AI 難易度** | やさしい (ヒューリスティック) / ふつう (1-ply) / つよい (2-ply Expectiminimax) / 達人 (選択的 3-ply) |
| **AI ペルソナ** | 6 体 — 見習い / 博士 / 森の番人 / 卿 / マスター / 賢者 (アバター + 表情変化 + 場面別台詞) |
| **ルール** | フル仕様 (ベアオフ・ヒット&バー・ダブリングキューブ・クロフォード・ギャモン/バックギャモン) |
| **バリアント** | 標準 / ナックギャモン / ハイパーギャモン / アシー・デューシー (簡略実装) |
| **着手品質判定** | 毎ターン「卓越! / お見事 / まあまあ / イマイチ / ミス」をバッジ表示 |
| **ゲーム後レビュー** | 1 ゲーム分の品質サマリ (バー・グラフ + 平均ロス) |
| **テーマ** | クラシック / オニキス / フォレスト / ロイヤル (ストーリー進行で解放) |
| **演出** | ドラッグ&ドロップ + 軌跡、ターングロー、ヒットフラッシュ、ギャモンスローモ、コンフェッティ、Web Audio 環境音楽 |
| **永続化** | localStorage で戦績・実績・解禁テーマ・解いたパズル・章クリア状況を保存 |

## 技術

- **言語:** HTML + CSS + 素の JavaScript (ES Modules)
- **依存:** ゼロ (ビルドツール不要)
- **AI:** 評価関数ベース + Web Worker で 2-ply / 選択的 3-ply Expectiminimax
- **音声:** Web Audio API (合成 + 同梱フリー音源対応)
- **描画:** HTML5 Canvas

## ローカル起動

ES Modules を使うため `file://` では動きません。簡易 HTTP サーバを使ってください。

```bash
# Python
python -m http.server 8765

# Node
npx serve .
```

その後、ブラウザで `http://localhost:8765/` を開きます。

VS Code を使っている場合は **Live Server** 拡張機能を使うと簡単です。

## ファイル構成

```
.
├── index.html
├── css/style.css
├── js/
│   ├── main.js              # エントリ
│   ├── game.js              # ゲーム状態
│   ├── rules.js             # 合法手生成
│   ├── render.js            # Canvas 描画
│   ├── input.js             # ドラッグ&ドロップ
│   ├── match.js             # マッチ進行 + クロフォード
│   ├── ai.js                # 4 段階 AI
│   ├── ai-worker.js         # Web Worker (2-ply / 3-ply)
│   ├── evaluate.js          # 評価関数 (EPC, プライム, コンテイメントなど)
│   ├── cube-advisor.js      # キューブ判断ヒント
│   ├── sound.js             # Web Audio + 環境音楽
│   ├── effects.js           # ドラマ演出
│   ├── ui.js                # モーダル類
│   ├── tutorial.js / lessons.js
│   ├── practice.js
│   ├── puzzle.js / puzzles-data.js  (21 問)
│   ├── story.js             # 6 章キャンペーン
│   ├── personas.js / avatar.js
│   ├── themes.js            # 4 テーマ
│   ├── variants.js          # バリアントルール
│   ├── achievements.js      # 19 種実績
│   ├── storage.js           # localStorage
│   ├── stats.js
│   ├── move-quality.js      # 着手品質判定
│   └── review.js            # ゲーム後レビュー
└── assets/sounds/
```

## デプロイ

Vercel と GitHub が連携済み。`main` ブランチへのプッシュで自動デプロイされます (約 30 秒)。

## ライセンス

MIT
