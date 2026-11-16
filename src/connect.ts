import { logoSvg } from './brand';
import {
  type Connection,
  type ConnectionDraft,
  envJsUrl,
  normaliseAddress,
  parseEnvJs,
  problems,
  removeConnection,
  saveConnection,
  savedConnections,
  suggestName,
} from './connection';
import { esc } from './sdk';

/**
 * The first step for anyone without a connection: pick a saved one, or add
 * one from their Unify address, its connection details (env.js) and the app
 * client ID their admin created. The full walk-through is the help page.
 */

export interface ConnectOptions {
  builtIn?: Connection;
  /** Sign in with this connection (the page reloads into it). */
  use(connection: Connection): void;
  /** Why we're here, e.g. a sign-in that failed. */
  notice?: string;
}

export function renderConnect(app: HTMLElement, o: ConnectOptions): void {
  const saved = [...(o.builtIn ? [o.builtIn] : []), ...savedConnections()];
  app.innerHTML = `
    <section class="page connect">
      <header class="top">
        <span class="brand"><span class="unify-logo" role="img" aria-label="Unify">${logoSvg()}</span><span class="brand-sep" aria-hidden="true"></span>Rewind</span>
        <nav class="links"><a href="#help">How it works</a><a href="?demo">Try the demo</a></nav>
      </header>
      <div class="page-head">
        <p class="eyebrow">Connect</p>
        <h1>Play back your year in Unify</h1>
        <p class="lead">Rewind signs you in to your own Unify environment and reads, in your browser, who created and changed what this year. It never writes to Unify. First time here? Your Unify admin sets Rewind up once; <a href="#help">here's what you both need</a>.</p>
      </div>
      ${o.notice ? `<p class="notice bad" role="alert">${esc(o.notice)}</p>` : ''}
      ${
        saved.length
          ? `<div class="panel">
              <h2>Your connections</h2>
              <ul class="saved">${saved
                .map(
                  (c) => `
                <li>
                  <div class="who"><strong>${esc(c.name)}</strong><span class="muted">${esc(c.address ? new URL(c.address).host : new URL(c.graphqlUrl).host)}</span></div>
                  <div class="row">
                    <button class="primary" data-use="${esc(c.id)}">Sign in</button>
                    ${c.builtIn ? '' : `<button class="ghost" data-remove="${esc(c.id)}" aria-label="Remove ${esc(c.name)}">Remove</button>`}
                  </div>
                </li>`,
                )
                .join('')}</ul>
            </div>`
          : ''
      }
      <form class="panel add" novalidate>
        <h2>${saved.length ? 'Add another connection' : 'Add your connection'}</h2>
        <ol class="steps">
          <li>
            <label for="address">Your Unify address</label>
            <p class="hint">The address you open Unify on.</p>
            <div class="inline">
              <input id="address" name="address" type="url" inputmode="url" autocomplete="url" placeholder="https://yourcompany.unify.cloud" />
              <a class="button" id="open-env" target="_blank" rel="noopener" aria-disabled="true">Open connection details ↗</a>
            </div>
          </li>
          <li>
            <label for="envjs">Paste the connection details</label>
            <p class="hint">On the page that opens, select everything (Ctrl/⌘ A), copy it, and paste it here.</p>
            <textarea id="envjs" name="envjs" rows="4" spellcheck="false" placeholder="globalThis.envConfig = { appSyncUrl: '…', … }"></textarea>
            <p class="found" aria-live="polite"></p>
            <details class="values">
              <summary>Enter the values by hand</summary>
              <label for="graphqlUrl">GraphQL URL <span class="muted">(appSyncUrl)</span></label>
              <input id="graphqlUrl" name="graphqlUrl" type="url" placeholder="https://yourcompany-api.unify.cloud/graphql" />
              <label for="cognitoDomain">Sign-in domain <span class="muted">(cognitoDomain)</span></label>
              <input id="cognitoDomain" name="cognitoDomain" placeholder="yourcompany-auth.unify.cloud" />
              <label for="userPoolId">User pool ID <span class="muted">(cognitoUserPoolId)</span></label>
              <input id="userPoolId" name="userPoolId" placeholder="eu-west-1_AbC123dEf" />
            </details>
          </li>
          <li>
            <label for="clientId">App client ID</label>
            <p class="hint">Your Unify admin creates it once, in Unify Management under App clients, and shares it with you.</p>
            <input id="clientId" name="clientId" autocomplete="off" spellcheck="false" placeholder="26 letters and digits" />
          </li>
          <li>
            <label for="name">Name this connection</label>
            <input id="name" name="name" placeholder="e.g. Acme production" />
          </li>
        </ol>
        <ul class="problems bad" role="alert"></ul>
        <div class="row"><button class="primary big" type="submit">Save and sign in</button></div>
        <p class="muted small">Saved in this browser only, so next time you just pick it. Nothing here is secret.</p>
      </form>
    </section>`;

  const form = app.querySelector<HTMLFormElement>('form.add')!;
  const field = (name: string) => form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!;
  const openEnv = app.querySelector<HTMLAnchorElement>('#open-env')!;
  const found = app.querySelector<HTMLElement>('.found')!;
  const values = app.querySelector<HTMLDetailsElement>('details.values')!;
  let nameTouched = false;

  const suggest = () => {
    if (!nameTouched) field('name').value = suggestName(field('address').value, field('graphqlUrl').value);
  };

  field('address').addEventListener('input', () => {
    const address = normaliseAddress(field('address').value);
    if (address) {
      openEnv.href = envJsUrl(address);
      openEnv.removeAttribute('aria-disabled');
    } else {
      openEnv.removeAttribute('href');
      openEnv.setAttribute('aria-disabled', 'true');
    }
    suggest();
  });

  field('envjs').addEventListener('input', () => {
    const v = parseEnvJs(field('envjs').value);
    const got: [string, string | undefined, string][] = [
      ['graphqlUrl', v.appSyncUrl, 'GraphQL URL'],
      ['cognitoDomain', v.cognitoDomain, 'sign-in domain'],
      ['userPoolId', v.cognitoUserPoolId, 'user pool ID'],
    ];
    for (const [name, value] of got) if (value) field(name).value = value;
    const ok = got.filter(([, value]) => value).map(([, , label]) => label);
    const missing = got.filter(([, value]) => !value).map(([, , label]) => label);
    if (!field('envjs').value.trim()) found.textContent = '';
    else if (!ok.length) found.innerHTML = '<span class="bad">That doesn’t look like the connection details. Paste the whole page that opened, or enter the values by hand.</span>';
    else found.innerHTML = `<span class="good">Found the ${ok.join(', ')}.</span>${missing.length ? ` <span class="bad">Missing: ${missing.join(', ')}.</span>` : ''}`;
    if (ok.length) values.open = true;
    suggest();
  });

  field('name').addEventListener('input', () => (nameTouched = true));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const draft: ConnectionDraft = {
      name: field('name').value,
      address: field('address').value || undefined,
      graphqlUrl: field('graphqlUrl').value,
      cognitoDomain: field('cognitoDomain').value,
      userPoolId: field('userPoolId').value,
      clientId: field('clientId').value,
    };
    const list = problems(draft);
    const box = app.querySelector<HTMLElement>('.problems')!;
    box.innerHTML = list.map((p) => `<li>${esc(p)}</li>`).join('');
    if (list.length) {
      if (list.some((p) => /GraphQL|sign-in domain|user pool/.test(p))) values.open = true;
      return;
    }
    o.use(saveConnection(draft));
  });

  app.querySelectorAll<HTMLButtonElement>('[data-use]').forEach((b) =>
    b.addEventListener('click', () => {
      const c = saved.find((x) => x.id === b.dataset.use);
      if (c) o.use(c);
    }),
  );
  app.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((b) =>
    b.addEventListener('click', () => {
      const c = saved.find((x) => x.id === b.dataset.remove);
      if (!c || !confirm(`Remove “${c.name}” from this browser? You can add it again later.`)) return;
      removeConnection(c.id);
      renderConnect(app, o);
    }),
  );

  (saved.length ? app.querySelector<HTMLButtonElement>('[data-use]') : field('address'))?.focus();
}
