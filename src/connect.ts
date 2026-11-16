import { logoSvg } from './brand';
import {
  type Connection,
  type ConnectionDraft,
  type EnvValues,
  envJsUrl,
  normaliseAddress,
  parseEnvJs,
  problems,
  removeConnection,
  saveConnection,
  savedConnections,
  suggestName,
} from './connection';
import { lookUpEnv } from './envjs';
import { esc } from './sdk';

/**
 * The first step for anyone without a connection: pick a saved one, or add
 * one from their Unify address: the connection details (env.js) are looked
 * up from it, with pasting and typing as fallbacks. The full walk-through is
 * the help page.
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
        <p class="lead">Rewind signs you in to your own Unify environment and reads, in your browser, who created and changed what this year. It never writes to Unify. First time here? Your Unify admin adds Rewind once; <a href="#help">here’s how</a>.</p>
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
            <p class="hint">The address you open Unify on. Rewind looks up the rest.</p>
            <div class="inline">
              <input id="address" name="address" type="url" inputmode="url" autocomplete="url" placeholder="https://yourcompany.unify.cloud" />
              <button type="button" id="lookup">Look up</button>
            </div>
            <p class="found" aria-live="polite"></p>
          </li>
          <li>
            <label for="name">Name this connection</label>
            <input id="name" name="name" placeholder="e.g. Acme production" />
          </li>
        </ol>
        <details class="values">
          <summary>Connection details</summary>
          <p class="hint">Filled in by the lookup. If it can’t reach your Unify, <a id="open-env" target="_blank" rel="noopener" aria-disabled="true">open your connection details</a>, select everything (Ctrl/⌘ A), copy it, and paste it here:</p>
          <textarea id="envjs" name="envjs" rows="3" spellcheck="false" placeholder="globalThis.envConfig = { appSyncUrl: '…', … }"></textarea>
          <p class="hint">Or copy them from Unify Management › Configuration.</p>
          <label for="graphqlUrl">GraphQL URL <span class="muted">(appSyncUrl · GraphQL Endpoint)</span></label>
          <input id="graphqlUrl" name="graphqlUrl" type="url" placeholder="https://yourcompany.api.svc.unify.cloud/graphql" />
          <label for="cognitoDomain">Sign-in domain <span class="muted">(cognitoDomain · Domain)</span></label>
          <input id="cognitoDomain" name="cognitoDomain" placeholder="…auth.eu-central-1.amazoncognito.com" />
          <label for="userPoolId">User pool ID <span class="muted">(cognitoUserPoolId · UserPool ID)</span></label>
          <input id="userPoolId" name="userPoolId" placeholder="eu-central-1_AbC123dEf" />
          <label for="clientId">App client ID <span class="muted">(cognitoClientId · Default App Client ID)</span></label>
          <input id="clientId" name="clientId" autocomplete="off" spellcheck="false" placeholder="26 letters and digits" />
        </details>
        <ul class="problems bad" role="alert"></ul>
        <div class="row"><button class="primary big" type="submit">Save and sign in</button></div>
        <p class="muted small">Saved in this browser only, so next time you just pick it. Nothing here is secret. Your Unify admin adds Rewind once first; <a href="#help">see how</a>.</p>
      </form>
    </section>`;

  const form = app.querySelector<HTMLFormElement>('form.add')!;
  const field = (name: string) => form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!;
  const openEnv = app.querySelector<HTMLAnchorElement>('#open-env')!;
  const found = app.querySelector<HTMLElement>('.found')!;
  const values = app.querySelector<HTMLDetailsElement>('details.values')!;
  const lookupButton = app.querySelector<HTMLButtonElement>('#lookup')!;
  let nameTouched = false;
  let lookedUp = '';

  const suggest = () => {
    if (!nameTouched) field('name').value = suggestName(field('address').value, field('graphqlUrl').value);
  };

  /** Puts found values in the fields and says what's still missing. */
  const fill = (v: EnvValues, from: string) => {
    const got: [string, string | undefined, string][] = [
      ['graphqlUrl', v.appSyncUrl, 'GraphQL URL'],
      ['cognitoDomain', v.cognitoDomain, 'sign-in domain'],
      ['userPoolId', v.cognitoUserPoolId, 'user pool ID'],
      ['clientId', v.cognitoClientId, 'app client ID'],
    ];
    for (const [name, value] of got) if (value) field(name).value = value;
    const missing = got.filter(([, value]) => !value).map(([, , label]) => label);
    found.innerHTML = missing.length
      ? `<span class="bad">Found part of the details ${esc(from)}; missing the ${esc(missing.join(', '))}. Fill them in under Connection details.</span>`
      : `<span class="good">✓ Found your connection details ${esc(from)}.</span>`;
    if (missing.length) values.open = true;
    suggest();
  };

  const syncLink = () => {
    const address = normaliseAddress(field('address').value);
    if (address) {
      openEnv.href = envJsUrl(address);
      openEnv.removeAttribute('aria-disabled');
    } else {
      openEnv.removeAttribute('href');
      openEnv.setAttribute('aria-disabled', 'true');
    }
    return address;
  };

  const lookup = async () => {
    const address = syncLink();
    if (!address || address === lookedUp) return;
    lookedUp = address;
    found.innerHTML = `<span class="muted">Looking up ${esc(new URL(address).host)}…</span>`;
    lookupButton.disabled = true;
    try {
      fill(await lookUpEnv(address), `on ${new URL(address).host}`);
    } catch (error) {
      lookedUp = '';
      found.innerHTML = `<span class="bad">${esc(error instanceof Error ? error.message : String(error))} You can paste the details instead.</span>`;
      values.open = true;
    } finally {
      lookupButton.disabled = false;
    }
  };

  field('address').addEventListener('input', () => {
    syncLink();
    suggest();
  });
  field('address').addEventListener('change', () => void lookup());
  field('address').addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') {
      e.preventDefault();
      void lookup();
    }
  });
  lookupButton.addEventListener('click', () => {
    lookedUp = '';
    void lookup();
  });

  field('envjs').addEventListener('input', () => {
    if (!field('envjs').value.trim()) return;
    const v = parseEnvJs(field('envjs').value);
    if (!v.appSyncUrl && !v.cognitoDomain && !v.cognitoUserPoolId && !v.cognitoClientId) {
      found.innerHTML = '<span class="bad">That doesn’t look like the connection details. Paste the whole page that opened, or fill in the fields.</span>';
      return;
    }
    fill(v, 'in what you pasted');
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
      if (list.some((p) => /GraphQL|sign-in domain|user pool|app client/.test(p))) values.open = true;
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
