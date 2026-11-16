// Inter, bundled with the site (no Google Fonts request from a customer-facing page).
import '@fontsource-variable/inter';
import { logoSvg } from './brand';
import { personCard, teamCard, drawCard } from './card';
import { demoSource } from './demo';
import { dayLabel, firstName, n } from './format';
import { tenantSource } from './load';
import { type Rewind, buildRewind, isActor } from './rewind';
import { OBJECT_TYPES, builtInConnection, callbackUrl, connect, esc, signOutHere } from './sdk';
import { renderConnect } from './connect';
import { type Connection, activeId, savedConnections, setActive } from './connection';
import { renderHelp } from './help';
import { personSlides, teamSlides } from './slides';
import { playStory } from './story';
import { type RawData, type Source } from './types';

const app = document.querySelector<HTMLElement>('#app')!;
const stage = document.createElement('div');
document.body.append(stage);

/**
 * Rewind plays one year: this one, or in January the year that just ended,
 * when people look back. There is no year to choose.
 */
const theYear = () => {
  const now = new Date();
  return now.getMonth() < 1 ? now.getFullYear() - 1 : now.getFullYear();
};

/** `#2026` for the lobby, `#2026/team` or `#2026/<user id>` for a story. The year in a link is ignored: it's always {@link theYear}. */
function readHash(): { year: number; who?: string } {
  const [, who] = location.hash.slice(1).split('/');
  return { year: theYear(), who: who ? decodeURIComponent(who) : undefined };
}
const setHash = (year: number, who?: string) => history.replaceState(null, '', `${location.pathname}${location.search}#${year}${who ? `/${encodeURIComponent(who)}` : ''}`);

let source: Source;
let rewind: Rewind;
const cache = new Map<number, RawData>();

/** Back to this page with no query or hash: a clean start, e.g. after choosing a connection. */
const home = (hash = '') => `${location.pathname}${hash}`;

/** The connection to sign in with: the one chosen last, or the developer's .env when nothing was saved. */
function activeConnection(): Connection | undefined {
  const builtIn = builtInConnection();
  const all = [...(builtIn ? [builtIn] : []), ...savedConnections()];
  return all.find((c) => c.id === activeId()) ?? (builtIn && !savedConnections().length ? builtIn : undefined);
}

let connection: Connection | undefined;

function showConnect(notice?: string): void {
  renderConnect(app, {
    builtIn: builtInConnection(),
    notice,
    use: (c) => {
      setActive(c.id);
      // A fresh page: the SDK is set up once per page, for one connection.
      location.assign(home());
    },
  });
}

function showHelp(): void {
  const inStory = !!rewind;
  renderHelp(app, {
    redirect: callbackUrl(),
    back: inStory ? `#${rewind.year}` : '#connect',
    backLabel: inStory ? 'Back to Rewind' : 'Connect',
  });
}

/** #help and #connect are pages of their own; anything else is the year. */
function route(): boolean {
  if (location.hash === '#help') {
    showHelp();
    return true;
  }
  if (location.hash === '#connect' && !source?.demo) {
    showConnect();
    return true;
  }
  return false;
}

window.addEventListener('hashchange', () => {
  if (route()) return;
  if (location.hash === '#connect') location.assign(home('#connect'));
  else if (rewind) lobby();
  else void start();
});

async function start(): Promise<void> {
  if (new URLSearchParams(location.search).has('demo')) {
    source = demoSource();
    if (location.hash === '#help') return showHelp();
  } else {
    if (route()) return;
    connection = activeConnection();
    if (!connection) return showConnect();
    app.innerHTML = `<section class="center"><div class="disc"></div><p class="muted">Signing in to ${esc(connection.name)}…</p></section>`;
    try {
      const { kg, me } = await connect(connection);
      // Dev only: `?bench` signs in and hands the client to the console (globalThis.rewindKg, with the SDK's types as rewindTypes) without loading a year, for timing queries.
      if (import.meta.env.DEV && new URLSearchParams(location.search).has('bench')) {
        Object.assign(globalThis, { rewindKg: kg, rewindTypes: OBJECT_TYPES });
        app.innerHTML = `<section class="center"><h2>Bench mode</h2><p class="muted">Signed in to ${esc(connection.name)}. The client is <code>globalThis.rewindKg</code>.</p></section>`;
        return;
      }
      source = tenantSource(kg, connection.name, me);
    } catch (error) {
      app.innerHTML = `
        <section class="center">
          <h1>Could not sign in to ${esc(connection.name)}</h1>
          <p class="muted">${esc(error instanceof Error ? error.message : String(error))}</p>
          <p class="muted">Check the connection, or see <a href="#help">If it doesn’t work</a>.</p>
          <div class="row"><button class="primary" data-retry>Try again</button><a class="button" href="#connect">Switch connection</a><a class="button" href="?demo">Open the demo</a></div>
        </section>`;
      app.querySelector('[data-retry]')!.addEventListener('click', () => location.assign(home()));
      return;
    }
  }
  const { year, who } = readHash();
  if (await load(year)) who ? play(who) : lobby();
}

async function load(year: number): Promise<boolean> {
  setHash(year);
  app.innerHTML = `
    <section class="center">
      <div class="disc"></div>
      <h2>Rewinding ${year}…</h2>
      <p class="muted progress-text">Reading the model’s history</p>
    </section>`;
  const text = app.querySelector<HTMLElement>('.progress-text')!;
  try {
    let data = cache.get(year);
    if (!data) {
      data = await source.load(year, (p) => {
        const of = (x: number, total?: number) => (total ? `${n(x)} of ${n(total)}` : n(x));
        text.textContent = `${of(p.elements, p.expected?.elements)} elements · ${of(p.relations, p.expected?.relations)} links · ${n(p.views)} views`;
      });
      cache.set(year, data);
    }
    rewind = buildRewind(data, year);
    return true;
  } catch (error) {
    app.innerHTML = `
      <section class="center">
        <h1>Could not read ${year}</h1>
        <p class="muted">${esc(error instanceof Error ? error.message : String(error))}</p>
        <div class="row"><button class="primary" data-retry>Try again</button><a class="button" href="?demo">Open the demo</a></div>
      </section>`;
    app.querySelector('[data-retry]')!.addEventListener('click', () => void load(year).then((ok) => ok && lobby()));
    return false;
  }
}

function lobby(): void {
  const r = rewind;
  setHash(r.year);
  const me = source.me ? r.people.find((p) => isActor(p.actor, source.me!)) : undefined;
  const others = [...r.people].sort((a, b) => a.actor.name.localeCompare(b.actor.name));
  app.innerHTML = `
    <section class="lobby">
      <header class="top">
        <span class="brand"><span class="unify-logo" role="img" aria-label="Unify">${logoSvg()}</span><span class="brand-sep" aria-hidden="true"></span>Rewind</span>
        <nav class="links">
          ${
            source.demo
              ? '<span class="muted">Demo <span class="chip">made-up data</span></span><a href="' + esc(home('#connect')) + '">Connect your Unify</a>'
              : `<span class="muted">Connected to <strong>${esc(source.label)}</strong></span><a href="#connect">Switch</a><button class="link" data-signout>Sign out</button>`
          }
          <a href="#help">Help</a>
        </nav>
      </header>
      <div class="hero-block">
        <p class="eyebrow">${r.partial ? `1 January – ${esc(dayLabel(r.end))}` : `The whole of ${r.year}`}</p>
        <h1 class="lobby-title">Rewind <span class="accent">${r.year}</span></h1>
        <p class="lead">A year in Unify, played back as a story: what we built, who built it, and when. Save the card at the end and share it.</p>
        <div class="row">
          <button class="primary big" data-play="team">▶ Play our year</button>
          ${source.me ? `<button class="big" data-play="${esc(source.me)}">${me ? `Play your year, ${esc(firstName(me.actor.name))}` : 'Play your year'}</button>` : ''}
        </div>
        <div class="glance">
          <div><strong>${n(r.totals.created)}</strong><span>elements added</span></div>
          <div><strong>${n(r.totals.linked)}</strong><span>links drawn</span></div>
          <div><strong>${n(r.people.length)}</strong><span>contributors</span></div>
        </div>
      </div>
      ${
        others.length
          ? `<div class="side">
              <label class="pick">Play someone's year
                <select data-who>
                  <option value="">Choose a person…</option>
                  ${others.map((p) => `<option value="${esc(p.actor.id)}">${esc(p.actor.name)}</option>`).join('')}
                </select>
              </label>
            </div>`
          : ''
      }
      <footer class="muted footnote">
        Counted from Unify’s system stamps: who created, last edited or hid each element, link and view. An edit counts for whoever edited an element last, as Unify keeps only that one.
        Imports and system accounts are left out of the rhythm, the rankings and the awards.${r.truncated ? ' <strong>Some lists stopped at their cap, so the numbers are a lower bound.</strong>' : ''}${r.viewsFailed ? ' <strong>This tenant wouldn’t list its views, so views are left out.</strong>' : ''}
      </footer>
    </section>`;
  app.querySelectorAll<HTMLButtonElement>('[data-play]').forEach((b) => b.addEventListener('click', () => play(b.dataset.play!)));
  app.querySelector<HTMLButtonElement>('[data-signout]')?.addEventListener('click', () => {
    if (connection) signOutHere(connection.clientId);
    // Back to the connection screen, not straight into a new sign-in.
    setActive(null);
    location.assign(home('#connect'));
  });
  app.querySelector<HTMLSelectElement>('[data-who]')?.addEventListener('change', (e) => {
    const id = (e.target as HTMLSelectElement).value;
    if (id) play(id);
  });
}

function play(who: string): void {
  const r = rewind;
  const team = who === 'team';
  const person = team ? undefined : r.people.find((p) => isActor(p.actor, who));
  const label = source.label;
  setHash(r.year, who);
  app.setAttribute('aria-hidden', 'true');
  const meId = source.me;
  // The team's story offers yours; a personal one offers the team's.
  const next = team ? meId : 'team';
  const slides = team ? teamSlides(r, label) : personSlides(r, person, person?.actor.name ?? 'there');
  let switching = false;
  const story = playStory(stage, {
    slides,
    card: () => drawCard(team || !person ? teamCard(r, label) : personCard(r, person, label)),
    fileName: `rewind-${r.year}-${team ? label : (person?.actor.name ?? 'me').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`,
    link: location.href,
    otherLabel: next === 'team' ? 'Play the team’s year' : next ? 'Play your year' : undefined,
    onClose: () => {
      app.removeAttribute('aria-hidden');
      if (!switching) lobby();
    },
    onAct: (act) => {
      const target = act === 'team' ? 'team' : next;
      if (!target) return;
      switching = true;
      story.close();
      play(target);
    },
  });
}

void start();
