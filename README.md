# 泥んこランナー

ジャージ姿の女性が日本の住宅街を走り、水たまりを避けながらどこまで走れるかを競うWebゲームです。
画面のどこをタップしてもジャンプでき、水たまりを4回踏むと終了。走った距離(m)がハイスコアとして端末に保存されます。

- タイトル → ゲーム → リザルト の3画面。操作はタップのみ(PCは Space / Enter / ↑ でも可)
- 縦長(スマホ)・横長(PC/スマホ横持ち)で表示レイアウトを自動で切り替え
- Vite + TypeScript + Canvas2D。ハイスコアは `localStorage` に保存

## 開発

```sh
npm ci
npm run dev      # 開発サーバー
npm run build    # 型チェック + dist/ へビルド
```

## GitHub Pages への公開

`.github/workflows/deploy.yml` が GitHub Actions でビルドして Pages にデプロイします。

1. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする
2. `main` に push する(または Actions タブから **Run workflow** で手動実行)
3. Pull Request ではビルドの確認のみ行い、公開はしません

ビルドは相対パス(`base: "./"`)なので、リポジトリ名が変わっても動きます。

## 素材

`assets-src/` に元画像(緑背景のJPG)があり、ゲームが読み込むのは `public/assets/` の変換済みファイルです。
元画像を差し替えたら再生成してコミットしてください(Python 3 + Pillow + numpy が必要)。

```sh
python3 scripts/process_assets.py
```

| 元画像 | 内容 |
| --- | --- |
| `char_run` | 走り(8コマ)+ジャンプ(8コマ)の 4×4 シート |
| `char_mud1` `char_mud2` `char_mud3` | 泥で汚れた3段階の同レイアウトのシート |
| `char_cry` | 4回目の被弾後に泣くアニメ(16コマ) |
| `puddle` | 泥の水たまりが跳ねるアニメ(4×5 の20コマ) |
| `bg_a` `bg_b` `bg_c` | 街並みの背景。A→B→C→A… の順に連結してループ |

背景は境目をクロスフェードして焼き込み、緑背景のスプライトはクロマキーで透過WebPにします。

### フォント

タイトルなどのUIは Mochiy Pop One(SIL OFL)を、使う文字を含む分割ファイルだけ `src/fonts/` に同梱しています。
画面に出す文言を変えたら再生成してください。

```sh
npm ci && python3 scripts/pick_font_subsets.py
```

## 調整しやすい値

走行速度・ジャンプの高さ/滞空・無敵時間・難易度カーブ・当たり判定は `src/config.ts` にまとまっています。
