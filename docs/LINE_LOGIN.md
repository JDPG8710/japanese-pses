# LINE Login

LINE Login reuses the existing D1 users, OAuth transactions and HTTP-only session cookies. First authorization creates an account; subsequent logins reuse the same LINE identity. Google and LINE accounts are separate unless an explicit account-linking flow is implemented.

## Console configuration

Create a LINE Login channel under the appropriate provider for Piko Game, choose Web app, and configure this exact callback URL:

`https://piko-game.com/api/auth/line`

Set the public privacy policy to `https://piko-game.com/privacy.html` and terms to `https://piko-game.com/terms.html`. Test in Developing status with a channel member, then publish the channel for general use after reviewing the console requirements.

Store `LINE_CHANNEL_ID` as a Worker variable and `LINE_CHANNEL_SECRET` as a Worker secret. Do not commit the secret or put it in browser code. For local server tests, use ignored `.dev.vars`; `.dev.vars.example` contains names only.

The login button appears only when `/api/auth/providers` reports LINE configured. Deploy Worker before Pages. No database migration is needed.

## Behavior and verification

The authorization uses `openid profile`, a one-time state cookie, nonce and PKCE S256. The Worker exchanges the code and validates the ID token with LINE's official verification API, including issuer, channel, subject, expiration and nonce. Tokens stay server-side. Auto login is enabled when LINE supports it; first consent, device authentication or QR login can still be required. An existing site session restores login on return.

Run `npm run test:auth` and `node tests/test_login_lifecycle_browser.mjs`. Live validation additionally requires a configured channel, deployment and a real LINE account. Test first login, return visit, consent cancellation, logout and existing Google login.

References: https://developers.line.biz/en/docs/line-login/integrate-line-login/ and https://developers.line.biz/en/reference/line-login/

## Setup progress (2026-10-03, Japan time)

- LINE developer account created with owner approval. Provider: Piko Game (`2005596999`); channel: Piko Game (`2011844745`), Japan / Web app.
- Callback and privacy/terms URLs saved. Channel remains Developing. Publishing is irreversible in the console and requires owner confirmation after live testing.
- `LINE_CHANNEL_SECRET` uploaded to `japanese-pses`; `LINE_CHANNEL_ID` added to `wrangler.toml`. Deployment credentials are in ignored `secrets/wrangler-auth`; set `XDG_CONFIG_HOME` to that directory and `WRANGLER_LOG_PATH` to `.wrangler/logs` when running Wrangler. Never print credentials.
- OAuth regression: 33 checks passed; login lifecycle/LINE button and privacy checks passed. Isolated HEAD-plus-login release at `.wrangler/line-release-20261003` passed the complete `predeploy:pages` suite with normal network access. A sandbox-only Japanese entry check failed because Tailwind CDN was denied; the complete suite with network access passed all nine widths.
- LINE Worker deployed as `84f6d5a8-9ddf-4f5e-b8ea-76a95e73be15`; Pages deployed at `https://1d043aec.manabi-pop.pages.dev` with release `aa355a019b1a`. Another active chat's Worker deployment `05fdfaed-bea2-4b70-bfeb-1938cbc03ee3` superseded it, leaving `/api/auth/providers` returning 404. Do not overwrite concurrently released work. Coordinate with chat `01a1002f-53fd-7b73-8d96-9419ec77ac52` (title: 重做节奏鼓队与创意游戏); authorization to send that chat a coordination message has been requested and is still pending.
- Pending: consolidate releases preserving both feature sets, confirm LINE endpoint and button, complete real login as channel member, then obtain owner confirmation to publish channel. Latest inline LINE button CSS needs to be included in the consolidated build.
- Browser policy blocks `https://open.weixin.qq.com`; do not bypass. WeChat platform setup must be completed manually by the owner. WeChat backend has not been implemented in this change.

2026-10-03 follow-up: restored LINE backend from the previously deployed designer Worker baseline, with only LINE changes to worker/index.js plus LINE_CHANNEL_ID. Worker version 745bc8b4-b59b-45d3-83c0-1a6e67ac78b8. Production /api/auth/providers returns 200 with google and line. Actual LINE login and channel publication still pending.
`n2026-10-03 latest: merged origin/main 01a72c1 to preserve the current AMC production release. All prior workspace changes committed as 10cd920; merge b36d2cc. LINE channel was publicly released with explicit owner approval (console shows Published). Frontend scoped release fbd8f9d000eb deployed; live arena verification found pages that skip AuthManager.initialize, so showLogin now refreshes enabled providers. Final corrected frontend validation/deployment and actual account login verification remain in progress.
