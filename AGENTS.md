# Rewind: notes for agents

A read-only SDK app that plays back a year of the Unify knowledge graph as a shareable story (see README.md for what users see).

## What talks to the SDK

- `src/sdk.ts` builds the config from a connection, signs in (Cognito authorization code flow, back to `callbackUrl()`: the page address under Vite's `base`) and reads the signed-in user id. A developer's `.env` becomes a built-in connection.
- `src/connection.ts` (pure, tested): connections, reading a pasted env.js, validation, the redirect URL; kept in `localStorage`.
- `src/load.ts` holds **every** SDK call, and they are all reads of system stamps. Keep it that way: `app.json` declares `capabilities: ["read"]`, and the gates fail on any write.
- `src/demo.ts` implements the same `Source` interface (`src/types.ts`) with seeded, generated data, for `?demo` and for running without `.env`. `demo.test.ts` pins the story it tells (March workshop, ServiceNow import, September clean-up, night owl, early bird).

## Pure logic (unit-tested)

- `src/rewind.ts`: acts in the year, team and per-person numbers, rhythm, streaks, headliner, personas, awards.
- `src/paging.ts`: reads a whole result in pages of 2,000, four at a time, halving a page the backend refuses. Its header has the page-size measurements from a busy test environment.
- `src/accounts.ts`: which accounts are people (automation and test names, `VITE_REWIND_NOT_PEOPLE`).

## Rendering

- `src/connect.ts`: the connection screen (`#connect`), the first step without a connection.
- `src/help.ts`: the instructions page (`#help`) for admins and users; shows the exact redirect URL.

- `src/slides.ts`: slide HTML per story. Escape every tenant string with `esc`.
- `src/story.ts`: the player. A slide advances on its progress bar's `animationend`; pausing pauses the CSS animation.
- `src/card.ts`: the share card, drawn on a canvas.
- `src/format.ts`: dates and numbers are pinned to `en-GB`, as the copy is English.
- Count-ups use timers, and `soon()` falls back to a timer, because hidden panes and some embedded browsers get no animation frames.

## Run

`npm run dev` (port 4206; `PORT=<port> npm run dev` for a port your app client allows as a redirect URL), `npm test`, `npm run typecheck`. Try `http://localhost:4206/?demo`. Gates: `node ../sdk-app-gates/bin/sdk-gates.js .`.

To time queries against a tenant, open `http://localhost:<port>/?bench` (dev builds only): it signs in and puts the client on `globalThis.rewindKg` (types on `rewindTypes`) without loading a year.

Publishing: `.github/workflows/pages.yml` (GitHub Pages; `BASE_PATH` sets Vite's `base`). See README, *Publishing on GitHub Pages*.
