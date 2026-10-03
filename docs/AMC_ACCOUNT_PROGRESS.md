# AMC hub: progress bound to the signed-in account

All AMC 8 / 10 / 12 progress on `/amc` is now saved to the signed-in account
(Cloudflare D1) instead of only in the browser's localStorage.

## What is saved

| Progress | Before (localStorage) | Now |
| --- | --- | --- |
| Real-style set best per area | `piko-amc-real:v1:{level}:{area}` | `amc_progress` kind `real`, key `10:alg` |
| Mock best (+ new: last 10 attempts) | `piko-amc-real:v1:{level}:mock` | `amc_progress` kind `mock` + `amc_attempts` |
| Foundation drill best (AMC 8) | `piko-independent-practice:v1:amc8:{topic}` | `amc_progress` kind `drill` |
| Lessons done | `piko-amc8-lessons:v1`, `piko-amc10-lessons:v1`, `piko-amc12-lessons:v1` | `amc_lessons` (done flag, last write wins) |

Allowed keys, set sizes and lesson ids live in `src/competitions/AmcProgressModel.mjs`,
shared by the browser and the Worker. `tests/test_amc_progress_model.mjs`
fails if a bank or lesson list changes without updating it.

## API (worker/amc-progress.mjs)

- `GET /api/amc/progress` returns `{authenticated:true, user:{id, displayName}, progress}` or `{authenticated:false}` (200, no data, when signed out).
- `POST /api/amc/progress` with `{events:[…]}` (1–40 events) returns `{progress, accepted, rejected}`.
- `POST /api/amc/import` with `{importId, snapshot}` does the one-time merge of a browser's guest progress (best score wins, completed lessons are united). It is idempotent per `importId`.

Rules:

- Writes need a valid, unrevoked session (the production `authenticate()`) and an allowed `Origin`.
- Every query is scoped to `session.sub`, and any user id in the body is ignored.
- The body limit is 16 KB.
- Each event is checked against the allow-lists and reachable scores; AMC 10/12 mocks must satisfy 6·correct + 1.5·blank and correct + blank + wrong = 25.
- More than 120 scored attempts per minute gets a 429.
- Each event id is recorded, so retries never double-count. Up to 30 attempts are kept per item.
- `DELETE /api/state` also deletes AMC rows.

## Browser (src/competitions/AmcProgressStore.mjs)

When signed in:

- One GET on page open loads the progress. The server copy is the source of truth.
- Every change is queued and sent 0.8 s later. Failed sends retry with backoff (2 s, 5 s, 15 s, 30 s, 60 s), and also when the browser comes back online.
- On `pagehide` or when the page is hidden, the queue is flushed with `keepalive`.
- The unsent queue is kept in a per-user cache (`piko-amc-user:v1:<hash of user id>`).

When signed out:

- Progress stays in `piko-amc-guest:v1`. Old keys are folded into it once.
- A trilingual sign-in prompt is shown on the hub, lesson and result screens.

First sign-in on a browser:

- The guest progress is imported once, then `piko-amc-guest:v1` is removed and `piko-amc-migrated:v1` is written. It can never merge into a second account.

Privacy:

- While nobody is signed in, cached copies of other accounts are deleted. Only an unsent queue is kept, with no progress snapshot.
- So the next person on the same browser never sees the previous user's results.

After Google or LINE sign-in, OAuth returns to `/?auth=success`. A small allow-listed script in `index.html` then sends the learner back to the `/amc…` URL they started from.

## Deploy order

The order is migration, then Worker, then Pages, all from the release PC:

1. `npx wrangler d1 migrations apply japanese-pses-production --remote --config wrangler.toml` (this is `npm run db:migrate`).
   - It applies every unapplied file in `migrations/` by name, so it also applies `0016_arcade_rankings.sql` if that has not been applied yet.
   - To apply only the AMC tables, run `npx wrangler d1 execute japanese-pses-production --remote --config wrangler.toml --file migrations/0017_amc_progress.sql`. The SQL is idempotent, so a later `migrations apply` re-running it is harmless.
2. Deploy the Worker with `npm run deploy:worker`.
3. Deploy Pages with `npm run predeploy:pages` and then `npm run deploy:pages`.
