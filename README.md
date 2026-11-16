# Rewind

A year in the Unify knowledge graph, played back as a story you can share. Built on `@bizzdesign/sdk-bundle` (browser entry). Read-only.

## What you see

**The lobby** shows the year at a glance and offers three stories: *our year* (the whole tenant), *your year* (whoever is signed in) and *someone's year* (pick a person). You can switch between this year and the two before it. Before February it opens on last year.

**A story** plays full-screen like a phone story: progress bars on top, tap the right of the card (or →) to go on, tap the left (or ←) to go back, hold to pause (or Space), Esc to close. Each slide moves on by itself when its bar fills. Numbers count up and bars grow; with *reduce motion* on, they just appear.

| Our year | Your year |
| --- | --- |
| The year's first new element, and who added it | How many elements, links, views, edits and tidy-ups you made |
| Elements, links, views and edits added, people vs imports | Your persona (Builder, Connector, Storyteller, Curator or Gardener): the kind of work where you did the biggest share of everyone's |
| How the model grew, 1 January → now | Your top types |
| What we modelled most, and types that got their first element ever | Your biggest day and busiest month |
| Busiest month and busiest single day (and who led it) | Your star creation: the element you added that drew the most links |
| Rhythm: weekday × hour heatmap, longest streak, active days | Your rhythm, night owl or early bird |
| The headliner: the element that gained the most links | Your rank, top %, and any awards you won |
| Top contributors (Watchtower's points) and awards, including Night Owl and Early Bird | |
| Behind the scenes: imports and tidy-ups | |

**The last slide** shows a 1080×1350 share card (4:5, fits Slack, Teams and LinkedIn). *Save image* downloads the PNG, *Copy image* puts it on the clipboard to paste into a chat, *Share…* appears where the browser can share files (phones), and *Copy link* copies a link that opens the same story (`#2026/team`, `#2026/<user id>`) for anyone with access to the tenant.

## Look and feel

Rewind wears Unify's look: colours, radii and type from the Unify frontend's design tokens (`nextgen-frontend`, `libs/shared/styles`, `variables-v2.scss`) and the Unify wordmark. The CSS is all in `src/unify.css`, layered over `src/style.css`; the share card's colours and the wordmark are in `src/brand.ts` and `src/card.ts`.

The story's slides wear BDCore's layer colours, the same ones Unify gives each type's icon (`BDcolorCore*`): Application cyan, Business yellow (Process, Organization, Product), Strategy orange (Capability), Motivation purple (Goal), Data blue, Technology green (Software and Hardware Technology) and Implementation salmon (Initiative). Unify's tokens are pastels, so each slide uses a vivid version of the hue with navy text and a deep tone of the same hue for highlights (`src/brand.ts`; `brand.test.ts` checks the contrast). A slide about a type takes that type's colour, so the year's top type, the headliner and your star creation each show in their own layer's colour; the other slides cycle through the layers, never two alike in a row. The cover, awards and outro stay Unify navy.

To undo it: `git revert` the "Unify look and feel" commit (and the layer-colour commit after it). For a quick look at the original lobby and slides without reverting, remove the `unify.css` link in `index.html` (the share card keeps the Unify colours).

## Where the numbers come from

Only the year is read in full; everything before it comes from counts.

| Need | SDK |
| --- | --- |
| Elements created in the year | `getObjects` with `createdAt` in the year, `systemAttributes` only |
| Older elements edited or hidden in the year | `getObjects` with `createdAt` before 1 January and `updatedAt` / `hiddenAt` in the year |
| The model's size on 1 January and today | `getCount()` on visible elements, plus hidden ones hidden later |
| Types that got their first element ever | one `getCount()` per type, created before 1 January |
| Links drawn in the year | `getRelations` with `createdAt` in the year, `source` / `target` for the headliner |
| The headliner, when it's an older element | `getObjects({ ids })` for the 25 elements that gained the most links |
| Views made | `getViews` with `createdAt` in the year; if the backend refuses that filter, every view, dated in the page |
| Who is signed in (for *your year*) | `sdk.authClient.getAuthenticatedUser()` |
| People vs imports | `SystemAttributesUser.origin` (`NATIVE` vs `EXTERNAL` / `SYSTEM`) |

Lists are read in pages of 2,000, four at a time, with the SDK's query batching off (a batch is one request that waits for its slowest query, which turned parallel pages into a queue). On a busy Bizzdesign test environment a request costs 7–10 s however small, so page size decides the speed: 34 elements a second at 100 a page, 207 at 500, 519 at 2,000. Links fail at 4,000 a page (the response gets too big), so a page that fails is fetched again in halves, down to 250. The measurements are in `src/paging.ts`. The gates warn about pages over 100 rather than failing, since Rewind only reads.

All the counting is in `src/rewind.ts` (pure, unit-tested). Days, weekdays and hours are the viewer's local time.

## People, not scripts

The story is about people, so these count as accounts (in the totals and *Behind the scenes*, not in rankings, rhythm, personas or awards):

- accounts whose origin isn't `NATIVE`;
- names that read like automation (n8n, bot, sync, import, integration…) or test users (E2E…, …Test);
- any name or user id in `VITE_REWIND_NOT_PEOPLE` (comma-separated), for the ones no rule can spot;
- **scripted bursts**: more than 20 changes by one account within a minute. Those changes move to a "*name* (scripted)" account, so a script run through someone's login (4,555 changes in one day, seen on a test environment) doesn't become their year.

Accounts with the same name are merged into one person, so someone with a password and an SSO account counts once.

## Limits

- **Last editor only.** Unify keeps only the latest edit of an element, so an element edited by three people in the year counts once, for the last of them. Edits within a minute of creating or hiding are part of that action.
- **No attribute history.** Stamps only; the story can't say which attribute changed or show a rename.
- **Imports are kept apart.** Accounts whose origin isn't `NATIVE` count in the totals and *Behind the scenes*, but not in the rhythm, rankings, personas or awards.
- **Types the SDK doesn't know are skipped.** The backend can be ahead of the SDK: a Bizzdesign test environment has `BDCore.ValueStream`, which SDK 8.2.2 refuses to map. Elements are read by the SDK's own type list, so those aren't counted, and links touching them are left out (one link there, Nov 2026).
- **Caps.** 40,000 per list. Past a cap the lobby says the numbers are a lower bound.
- **Browser only.** Everything is computed in the page; nothing is stored or sent anywhere. The card is made locally on a canvas.

## Connecting (customers)

Rewind is a static page that signs each visitor in to **their own** Unify environment; nothing goes through Bizzdesign. The in-app help page (`#help`) is the walk-through people read; in short:

- **Once per organisation, a Unify admin** (system administrator role) opens Unify Management › Configuration › MCP Integration Configuration › **MCP Server Callbacks** (not AI co-worker › MCP endpoints, which registers servers the assistant calls) and adds the page's address, e.g. `https://bizzdesign.github.io/rewind/`. That list is the redirect URLs of Unify's own (default) app client, the one with Unify's sign-in page.
- **Everyone, the first time:** type the Unify address on the connection screen. Rewind looks up the connection details from `<address>/env.js` (see below), suggests a name, and *Save and sign in* goes to the tenant's own sign-in page.
- **Next time:** the connection is remembered in that browser. *Switch* picks another or adds one; *Sign out* forgets the sign-in in this browser.

**Why not App clients?** Unify Management can create *Authorization code* app clients, which would be the clean way, but Unify's sign-in uses Cognito's managed login, and those clients get no managed-login style, so Cognito shows "Login pages unavailable" (Nov 2026). Fixing that means creating a managed-login branding for each new code-flow client in the backend's `AppClientService`; then an admin could give Rewind its own client and enter its ID under *Connection details*.

**The lookup.** env.js has no CORS headers, so it can't be fetched as data from another site, but it is served as JavaScript and may run as a script. Rewind runs it in a sandboxed iframe (scripts only, opaque origin, no access to Rewind's storage) and takes back four strings: `appSyncUrl`, `cognitoDomain`, `cognitoUserPoolId` and `cognitoClientId` (`src/envjs.ts`). If that fails, people paste the file, or type the values from Unify Management › Configuration. The region is the pool ID's prefix; live updates aren't used. Connections are kept in `localStorage`; none of it is secret.

## Publishing on GitHub Pages

`.github/workflows/pages.yml` tests, builds and publishes on every push to `main`:

1. Settings › Pages › Source: **GitHub Actions**.
2. Give the repository read access to `@bizzdesign/sdk-bundle` (package settings › Manage Actions access); the workflow installs it with its own token. (The SDK is also on npmjs.org, if the repository can't reach GitHub Packages.)
3. The site is served at `https://<org>.github.io/<repo>/`. For a custom domain, set it in Settings › Pages and set the repository variable `REWIND_BASE_PATH` to `/`.
4. That address is what every admin registers as the redirect URL. It must match exactly, trailing slash included; changing it means every customer updates their app client.

The site holds no secrets and loads nothing from third parties (Inter is bundled). Before sharing it with customers, read *Is this for customers?* below.

## Is this for customers?

Points to settle before publishing outside Bizzdesign:

- **Names.** Rankings, awards and personal years show colleagues by name to anyone who can read the model. Customers' works councils and GDPR may need person-level stories to be optional, or anonymised.
- **Load.** Reading a whole year in pages of 2,000 is heavier than the gates' 100-per-call guidance (a warning for read-only apps). Agree it with the platform team before many tenants use it at once.
- **Tier.** `app.json` says `experimental`; a customer-facing app belongs in `shared` or `certified`, with the gates in this repository's CI.
- **SDK upkeep.** Tenants can run ahead of the SDK (as `BDCore.ValueStream` showed); keep the SDK current.

## Run it

```bash
cp .env.example .env   # optional: a built-in connection for development
npm install
npm run dev            # http://localhost:4206
npm test
```

`http://localhost:4206/?demo` plays a made-up tenant without signing in. To sign in during development, add a connection on the connection screen, or put one in `.env` (see `.env.example`). The redirect URL is the page's own address, so run on a port your app client lists, e.g. `PORT=4200 npm run dev` with `http://localhost:4200` as a redirect URL (http is allowed for localhost only).
