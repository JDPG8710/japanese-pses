# サイトアクセスの国別集計

首頁の右上に総アクセス数と上位3地域を表示し、クリックすると全地域の降順一覧を開く。表示は国旗と回数。国名と正確な数は補助ラベルにも残す。K/M/B表記はゲームのプレイ回数と共通。

`index.html`、`world.html`、`grades.html`、`learn.html` を開く・更新するごとに1ページビューを加算する。ゲストも含み、同じ利用者の再訪問も数える。ユニーク人数やゲーム開始数ではない。言語切替・国の選択・パネル開閉では加算しない。過去のアクセス数は推測して投入しない。

`GET /api/site-visits` は総数と国別一覧を返す。`POST` はページごとに新しいUUIDを受け取り、再送は同じIDを使う。D1トリガーによる原子的な加算と24時間の再送重複排除を行う。接続国はCloudflareの `request.cf.country` を使い、クライアント申告や選択言語で変えない。未判定は `XX` として地球マークで表示する。IPアドレス・氏名は保存しない。国は接続元の地域であり、利用者の国籍ではない。

`migrations/0011_site_visits.sql` → Worker → Pages の順に公開する。静的ローカルサーバーのみ、またはオフラインでは全站集計APIを利用できず「—」を表示する。HTTPリトライ以外のオフライン再送は行わない。

国旗素材は `flag-icons` 7.5.0（https://github.com/lipis/flag-icons 、MIT）から4:3 SVGを同梱する。ライセンスは `assets/flags/LICENSE`。外部の旗画像サーバーにはアクセスしない。

検証：`node tests/test_site_visits.mjs`（実D1）、`node tests/test_site_visits_browser.mjs`（Chrome/Edge、320/390/1280px）。
