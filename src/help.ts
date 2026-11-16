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
        <a href="#admin">For admins: set up once</a>
        <a href="#connect-steps">For everyone: connect</a>
        <a href="#next-time">Next time</a>
        <a href="#privacy">What Rewind reads</a>
        <a href="#trouble">If it doesn’t work</a>
      </nav>

      <article class="panel" id="need">
        <h2>What you need</h2>
        <ul>
          <li><strong>Your Unify address</strong>, the one you open Unify on, e.g. <code>https://yourcompany.unify.cloud</code>.</li>
          <li><strong>An app client ID for Rewind.</strong> Your Unify admin creates it once for your whole organisation (below) and shares it.</li>
          <li><strong>Your own Unify account.</strong> You sign in as yourself and see only what your account can read.</li>
        </ul>
      </article>

      <article class="panel" id="admin">
        <h2>For admins: set Rewind up once</h2>
        <p>Your Unify only lets people sign in from addresses it knows. Registering Rewind as an <em>app client</em> tells it about this page. You need the system administrator role in Unify.</p>
        <ol class="howto">
          <li>Open <strong>Unify Management</strong> and go to <strong>App clients</strong>.</li>
          <li>Choose <strong>Create</strong>, name it <strong>Rewind</strong>, and pick the <strong>Authorization code</strong> flow. (Not client credentials: people sign in as themselves, so it has no secret and no roles of its own.)</li>
          <li>Under <strong>Redirect URLs</strong>, add exactly: ${copy(o.redirect)}</li>
          <li>Add the same address as a <strong>sign-out URL</strong>, so <em>Sign out</em> brings people back here.</li>
          <li>Save, and copy the new client’s <strong>Client ID</strong>.</li>
          <li>Share the client ID and your Unify address with your colleagues, for instance with a link to this page.</li>
        </ol>
        <p class="muted small">The redirect URL must match to the character, including <code>https://</code> and any trailing slash. To remove Rewind later, delete the app client; nobody can sign in through it after that.</p>
      </article>

      <article class="panel" id="connect-steps">
        <h2>For everyone: connect</h2>
        <ol class="howto">
          <li>Open Rewind and choose <strong>Add your connection</strong>.</li>
          <li>Type your <strong>Unify address</strong> and choose <strong>Open connection details</strong>. A page full of settings opens in a new tab.</li>
          <li>On that page, select everything (Ctrl A, or ⌘ A on a Mac), copy it, and paste it into <strong>Paste the connection details</strong>. Rewind picks out the three values it needs. (Or open <em>Enter the values by hand</em> and fill in <code>appSyncUrl</code>, <code>cognitoDomain</code> and <code>cognitoUserPoolId</code> from that page.)</li>
          <li>Paste the <strong>app client ID</strong> from your admin.</li>
          <li>Give the connection a name and choose <strong>Save and sign in</strong>. You sign in on your own Unify’s sign-in page and come straight back.</li>
          <li>Choose <strong>Play our year</strong>, <strong>Play your year</strong>, or anyone else’s. Tap or use the arrow keys to move, hold to pause, and save the card at the end.</li>
        </ol>
      </article>

      <article class="panel" id="next-time">
        <h2>Next time</h2>
        <ul>
          <li>Your connection is remembered in this browser: open Rewind and you’re signed straight in, or asked to sign in again when your session has expired.</li>
          <li><strong>Switch</strong> (top of the page) takes you back to your connections: pick another one, add one for a second environment, or remove one.</li>
          <li><strong>Sign out</strong> ends your Unify session. On a shared computer, also remove the connection.</li>
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
          <dd>The app client doesn’t list this page. Ask your admin to add exactly ${copy(o.redirect)} as a redirect URL.</dd>
          <dt>“Missing” values after pasting</dt>
          <dd>Make sure you copied the whole page that opened from <em>Open connection details</em>, or enter the values by hand.</dd>
          <dt>The connection details page shows an error</dt>
          <dd>Check the address: it’s the one you open Unify on, without anything after the domain.</dd>
          <dt>“The app client ID is malformed”, or the sign-in page says the client doesn’t exist</dt>
          <dd>Copy the client ID again from your admin; it’s 26 letters and digits. A client created for another environment won’t work here.</dd>
          <dt>Loading takes a minute or more</dt>
          <dd>Busy models have tens of thousands of changes a year; Rewind shows how far it is. Keep the tab open.</dd>
          <dt>Sign out shows an error</dt>
          <dd>Ask your admin to add this page as a sign-out URL too.</dd>
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
