import { logoSvg } from './brand';
import { esc } from './sdk';

/**
 * How to set Rewind up and use it: what the admin does once, what everyone
 * else does, and what to do when it doesn't work. `redirect` is this page's
 * own address, which the admin must register exactly.
 */
export function renderHelp(app: HTMLElement, o: { redirect: string; back: string; backLabel: string }): void {
  const copy = (value: string) =>
    `<span class="copy"><code>${esc(value)}</code><button type="button" class="small" data-copy="${esc(value)}">Copy</button></span>`;

  app.innerHTML = `
    <section class="page help">
      <header class="top">
        <span class="brand"><span class="unify-logo" role="img" aria-label="Unify">${logoSvg()}</span><span class="brand-sep" aria-hidden="true"></span>Rewind</span>
        <nav class="links"><a href="${esc(o.back)}">${esc(o.backLabel)}</a><a href="?demo">Try the demo</a></nav>
      </header>

      <div class="page-head">
        <p class="eyebrow">How it works</p>
        <h1>Rewind: your year in Unify</h1>
        <p class="lead">Rewind plays back a year of your Unify knowledge graph as a short story: what the team added, the busiest days, the most connected elements, who did what. It ends with a card you can save and share. Each person can also play their own year.</p>
      </div>

      <nav class="toc panel" aria-label="On this page">
        <a href="#need">What you need</a>
        <a href="#admin">For admins: add Rewind once</a>
        <a href="#connect-steps">For everyone: connect</a>
        <a href="#next-time">Next time</a>
        <a href="#privacy">What Rewind reads</a>
        <a href="#trouble">If it doesn’t work</a>
      </nav>

      <article class="panel" id="need">
        <h2>What you need</h2>
        <ul>
          <li><strong>Your Unify address</strong>, the one you open Unify on, e.g. <code>https://yourcompany.unify.cloud</code>. Rewind looks up everything else from it.</li>
          <li><strong>Your own Unify account.</strong> You sign in as yourself and see only what your account can read.</li>
          <li><strong>Rewind added once by your Unify admin</strong> (below). Until then, signing in stops with an error on your Unify’s sign-in page.</li>
        </ul>
      </article>

      <article class="panel" id="admin">
        <h2>For admins: add Rewind once</h2>
        <p>Your Unify only sends people back to addresses it knows. Rewind signs in through Unify’s own sign-in page, the same one MCP connectors such as Claude use, so you add Rewind’s address where those are listed. You need the system administrator role.</p>
        <ol class="howto">
          <li>Open <strong>Unify Management</strong> and choose <strong>Configuration</strong> in the menu.</li>
          <li>Scroll to <strong>MCP Integration Configuration</strong>, then <strong>MCP Server Callbacks</strong>.</li>
          <li>In the field showing <code>https://example.com/api/callback</code>, enter exactly ${copy(o.redirect)} and press Enter. It appears in the list.</li>
          <li>Tell your colleagues: open Rewind, type your Unify address, and sign in. There’s nothing else to share.</li>
        </ol>
        <p class="muted small">The address must match to the character, including <code>https://</code> and the trailing slash. To stop Rewind signing in, remove it from that list again.</p>
        <p class="muted small"><strong>Not under AI co-worker › MCP endpoints.</strong> That page registers servers the assistant calls; adding Rewind there doesn’t let anyone sign in, and the assistant would try to call it. If you added it there, delete that endpoint.</p>
        <p class="muted small"><strong>Why not App clients?</strong> An app client created under Unify Management › App clients doesn’t get Unify’s sign-in page yet: signing in with it shows “Login pages unavailable”. Once that’s fixed, an <em>Authorization code</em> client (not client credentials) with this address as redirect URL will work too; enter its client ID under Connection details.</p>
      </article>

      <article class="panel" id="connect-steps">
        <h2>For everyone: connect</h2>
        <ol class="howto">
          <li>Open Rewind. The first time, it asks for your connection.</li>
          <li>Type your <strong>Unify address</strong> and press Enter (or <strong>Look up</strong>). Rewind reads your Unify’s public connection details and says when it found them.</li>
          <li>Keep or change the <strong>name</strong>, and choose <strong>Save and sign in</strong>. You sign in on your own Unify’s sign-in page and come straight back.</li>
          <li>Choose <strong>Play our year</strong>, <strong>Play your year</strong>, or anyone else’s. Tap or use the arrow keys to move, hold to pause, and save the card at the end.</li>
        </ol>
        <p class="muted small">If the lookup can’t reach your Unify (a strict network, say), open <strong>Connection details</strong>: follow the link to your connection details, select everything, copy it and paste it in. Or type the four values; an admin finds them in Unify Management › Configuration (GraphQL Endpoint, Domain, UserPool ID, Default App Client ID).</p>
      </article>

      <article class="panel" id="next-time">
        <h2>Next time</h2>
        <ul>
          <li>Your connection is remembered in this browser: open Rewind and you’re signed straight in, or asked to sign in again when your session has expired.</li>
          <li><strong>Switch</strong> (top of the page) takes you back to your connections: pick another one, add one for a second environment, or remove one.</li>
          <li><strong>Sign out</strong> makes this browser forget your sign-in and takes you back to your connections. Your Unify sign-in itself can last up to an hour; sign out in Unify to end it, and on a shared computer also remove the connection.</li>
          <li>On another browser or computer you add the connection once more.</li>
        </ul>
      </article>

      <article class="panel" id="privacy">
        <h2>What Rewind reads, and who sees what</h2>
        <ul>
          <li><strong>Read only.</strong> Rewind never changes anything in Unify.</li>
          <li><strong>Only stamps.</strong> It reads who created, last edited or hid each element, link and view this year, and when. No attribute values, descriptions or view contents.</li>
          <li><strong>In your browser.</strong> The counting happens on your computer. Nothing is sent anywhere else, and Rewind keeps no data except your connection settings, in your browser.</li>
          <li><strong>Your own access.</strong> You see only what your Unify account may read.</li>
          <li><strong>Names are visible.</strong> Rankings, awards and each person’s year show colleagues by name to everyone who can read the model. Admins: check that this fits your organisation before you share Rewind.</li>
          <li><strong>Imports and scripts aren’t people.</strong> Import and integration accounts, test users, and bursts of more than 20 changes a minute count in the totals but not in the rankings.</li>
        </ul>
      </article>

      <article class="panel" id="trouble">
        <h2>If it doesn’t work</h2>
        <dl class="faq">
          <dt>The sign-in page says <code>redirect_mismatch</code> or “An error was encountered”</dt>
          <dd>Your Unify doesn’t know Rewind yet. Ask your admin to add exactly ${copy(o.redirect)} under Unify Management › Configuration › MCP Server Callbacks (not under AI co-worker › MCP endpoints).</dd>
          <dt>The sign-in page says “Login pages unavailable”</dt>
          <dd>The connection uses an app client from Unify Management › App clients, which has no sign-in page yet. Switch, remove the connection, and add it again from your Unify address, so it uses Unify’s default client.</dd>
          <dt>“Couldn’t load …/env.js” after typing the address</dt>
          <dd>Check the address: it’s the one you open Unify on, without anything after the domain. If it’s right, your network may block it; paste the details instead (Connection details).</dd>
          <dt>Loading takes a minute or more</dt>
          <dd>Busy models have tens of thousands of changes a year; Rewind shows how far it is. Keep the tab open.</dd>
          <dt>My connections are gone</dt>
          <dd>They live in this browser; clearing site data or a private window forgets them. Add the connection again.</dd>
        </dl>
        <p>Want to see it first? <a href="?demo">Try the demo</a> with a made-up company, no sign-in needed.</p>
      </article>
    </section>`;

  app.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((b) =>
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy!);
        b.textContent = 'Copied';
      } catch {
        b.textContent = 'Select and copy';
      }
      setTimeout(() => (b.textContent = 'Copy'), 2000);
    }),
  );
  // In-page links (#admin, …) scroll within the page instead of changing the route.
  app.querySelectorAll<HTMLAnchorElement>('.toc a').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      app.querySelector(a.getAttribute('href')!)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }),
  );
  window.scrollTo(0, 0);
}
