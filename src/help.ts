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
        <p class="lead">Rewind plays back a year in Unify as a short story: what the team added, the busiest days, the most connected elements, who did what. It ends with a card you can save and share. Each person can also play their own year.</p>
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
          <li><strong>Your Unify address</strong>, the one you open Unify on, e.g. <code>https://yourcompany.unify.cloud</code>. Rewind looks up the connection details from it.</li>
          <li><strong>Your own Unify account.</strong> You sign in as yourself and see only what your account can read.</li>
          <li><strong>Rewind added once by your Unify admin</strong> (below), usually as an app client whose ID they share with you. Until then, signing in stops with an error on your Unify’s sign-in page.</li>
        </ul>
      </article>

      <article class="panel" id="admin">
        <h2>For admins: add Rewind once</h2>
        <p>Your Unify only sends people back to addresses it knows. Tell it about Rewind in one of two ways. You need the system administrator role.</p>
        <h3>Recommended: an app client for Rewind</h3>
        <ol class="howto">
          <li>Open <strong>Unify Management</strong> and go to <strong>App clients</strong>.</li>
          <li>Choose <strong>Create</strong>, name it <strong>Rewind</strong>, and pick the <strong>Authorization code</strong> flow. (Not client credentials: people sign in as themselves, so it has no secret and no roles of its own.)</li>
          <li>Under <strong>Redirect URLs</strong>, add exactly: ${copy(o.redirect)} Add the same address as a <strong>sign-out URL</strong>.</li>
          <li>Save, and copy the new client’s <strong>Client ID</strong>.</li>
          <li>Share the client ID with your colleagues, with your Unify address and a link to this page. They enter it under <em>App client ID from your admin</em>.</li>
        </ol>
        <p class="muted small">Needs a Unify from late November 2026 or newer. An Authorization code client created before that shows “Login pages unavailable” when signing in: delete it and create it again. The sign-in page uses Cognito’s standard look for now. To remove Rewind, delete the app client; nobody can sign in through it after that.</p>
        <h3>Alternative: through Unify’s own sign-in client</h3>
        <ol class="howto">
          <li>In <strong>Unify Management</strong>, choose <strong>Configuration</strong> in the menu.</li>
          <li>Scroll to <strong>MCP Integration Configuration</strong>, then <strong>MCP Server Callbacks</strong>.</li>
          <li>In the field showing <code>https://example.com/api/callback</code>, enter exactly ${copy(o.redirect)} and press Enter.</li>
          <li>There’s no client ID to share: people leave <em>App client ID from your admin</em> empty, and Rewind uses Unify’s default client.</li>
        </ol>
        <p class="muted small">Not under AI co-worker › MCP endpoints: that page registers servers the assistant calls, and adding Rewind there doesn’t let anyone sign in. Either way, the address must match to the character, including <code>https://</code> and the trailing slash.</p>
      </article>

      <article class="panel" id="connect-steps">
        <h2>For everyone: connect</h2>
        <ol class="howto">
          <li>Open Rewind. The first time, it asks for your connection.</li>
          <li>Type your <strong>Unify address</strong> and press Enter (or <strong>Look up</strong>). Rewind reads your Unify’s public connection details and says when it found them.</li>
          <li>Paste the <strong>app client ID</strong> your admin shared. If they set Rewind up through MCP Server Callbacks, leave it empty.</li>
          <li>Keep or change the <strong>name</strong>, and choose <strong>Save and sign in</strong>. You sign in on your own Unify’s sign-in page and come straight back.</li>
          <li>Choose <strong>Play our year</strong>, <strong>Play your year</strong>, or anyone else’s. Tap or use the arrow keys to move, hold to pause, and save the card at the end.</li>
        </ol>
        <p class="muted small">If the lookup can’t reach your Unify (a strict network, say), open <strong>Connection details</strong>: follow the link to your connection details, select everything, copy it and paste it in. Or type the values; an admin finds them in Unify Management › Configuration (GraphQL Endpoint, Domain, UserPool ID, Default App Client ID).</p>
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
          <dd>Your Unify doesn’t know Rewind’s address for this client. Ask your admin to add exactly ${copy(o.redirect)} as a redirect URL of the Rewind app client, or under Configuration › MCP Server Callbacks if you left the client ID empty. Check you used the client ID for this environment.</dd>
          <dt>The sign-in page says “Login pages unavailable”</dt>
          <dd>The app client was created before Unify supported it (late November 2026), or your Unify isn’t updated yet. Your admin deletes the client and creates it again; if that doesn’t help, they can use the MCP Server Callbacks route and you leave the client ID empty. Switch, remove the connection, and add it again with the new client ID (or none).</dd>
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
