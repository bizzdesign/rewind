/**
 * Connections: which Unify environment to sign in to, as the person entered
 * it. Kept in this browser only (localStorage), so a second visit can pick
 * one again. Nothing here is secret: the app client is public (no secret) and
 * the rest is what any visitor of the tenant can read in its env.js.
 *
 * Pure apart from the storage helpers at the bottom; tested in connection.test.ts.
 */

export interface Connection {
  id: string;
  /** What the person calls it, e.g. "Acme production". */
  name: string;
  /** The Unify address they typed, e.g. https://acme.unify.cloud (for display and the env.js link). */
  address?: string;
  /** env.js `appSyncUrl`. */
  graphqlUrl: string;
  /** env.js `cognitoDomain`, without scheme. */
  cognitoDomain: string;
  /** env.js `cognitoUserPoolId`; its prefix is the region. */
  userPoolId: string;
  /** Unify's default app client (env.js cognitoClientId), whose redirect URLs the admin extends with Rewind's address. */
  clientId: string;
  /** From the developer's .env: shown, never stored or removed. */
  builtIn?: boolean;
}

export type ConnectionDraft = Omit<Connection, 'id' | 'builtIn'>;

/** The values Rewind reads from a pasted env.js. */
export interface EnvValues {
  appSyncUrl?: string;
  cognitoDomain?: string;
  cognitoUserPoolId?: string;
  /** Unify's own (default) app client. */
  cognitoClientId?: string;
}

/**
 * Reads `key: 'value'` pairs the way the SDK reads env.js (after
 * `globalThis.envConfig`), but forgiving: the marker is optional, so a pasted
 * object or a JSON snippet works too.
 */
export function parseEnvJs(text: string): EnvValues {
  const start = text.indexOf('globalThis.envConfig');
  const body = start >= 0 ? text.slice(start) : text;
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/["']?(\w+)["']?\s*:\s*(['"])([\s\S]*?)\2/g)) {
    const [, key, , value] = m;
    if (key && value !== undefined && !(key in out)) out[key] = value.trim();
  }
  return { appSyncUrl: out.appSyncUrl, cognitoDomain: out.cognitoDomain, cognitoUserPoolId: out.cognitoUserPoolId, cognitoClientId: out.cognitoClientId };
}

/** `eu-west-1_AbC123dEf` → `eu-west-1`. */
export const regionOf = (userPoolId: string) => userPoolId.split('_')[0] ?? '';

/** Live updates aren't used by Rewind, but the SDK wants the address: `https://x/graphql` → `wss://x/graphql/realtime`. */
export const realtimeOf = (graphqlUrl: string) => `${graphqlUrl.replace(/^https:/, 'wss:').replace(/\/+$/, '')}/realtime`;

/** `https://acme.unify.cloud/anything` or `acme.unify.cloud` → `https://acme.unify.cloud`, or undefined when it isn't an address. */
export function normaliseAddress(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) && url.hostname !== 'localhost') return undefined;
    return `${url.protocol}//${url.host}`;
  } catch {
    return undefined;
  }
}

/** Where the tenant's connection details are: `<address>/env.js`. */
export const envJsUrl = (address: string) => `${normaliseAddress(address) ?? address}/env.js`;

/** A default name from the address or GraphQL host: `acme.unify.cloud` → `acme`, `acme-api.unify.cloud` → `acme`. */
export function suggestName(address: string | undefined, graphqlUrl: string | undefined): string {
  for (const candidate of [address, graphqlUrl]) {
    const normal = candidate && normaliseAddress(candidate);
    if (normal) return new URL(normal).hostname.split('.')[0]!.replace(/-api$/, '');
  }
  return '';
}

export const cleanDomain = (domain: string) => domain.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');

/** What's wrong with a draft, in words a person can act on; empty when it can be used. */
export function problems(d: Partial<ConnectionDraft>): string[] {
  const out: string[] = [];
  if (!d.name?.trim()) out.push('Give the connection a name.');
  try {
    const url = new URL(d.graphqlUrl ?? '');
    if (url.protocol !== 'https:') out.push('The GraphQL URL must start with https://.');
  } catch {
    out.push('The GraphQL URL is missing. Paste your connection details, or enter it by hand (appSyncUrl in env.js).');
  }
  if (!d.cognitoDomain || !/^[a-z0-9.-]+$/i.test(cleanDomain(d.cognitoDomain))) out.push('The sign-in domain is missing (cognitoDomain in env.js).');
  if (!d.userPoolId || !/^[a-z]{2}(-[a-z]+)+-\d_[A-Za-z0-9]+$/.test(d.userPoolId.trim())) out.push('The user pool ID is missing or malformed; it looks like eu-west-1_AbC123dEf (cognitoUserPoolId in env.js).');
  if (!d.clientId || !/^[a-z0-9]{20,40}$/i.test(d.clientId.trim())) out.push('The app client ID is missing or malformed (cognitoClientId in env.js; Unify Management shows it as Default App Client ID).');
  return out;
}

/** The address Cognito sends people back to. It must be on the app client's list exactly. */
export function redirectUrl(origin: string, base: string): string {
  // At the root, the bare origin (http://localhost:4200), as registered for local development;
  // under a path (GitHub Pages), origin and path with its trailing slash.
  return base === '/' || base === '' ? origin : new URL(base, `${origin}/`).href;
}

// ── Storage ────────────────────────────────────────────────────────────

const LIST = 'rewind.connections';
const ACTIVE = 'rewind.activeConnection';

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private windows and blocked storage: the connection then lasts for this visit only.
  }
};

export function savedConnections(): Connection[] {
  try {
    const list = JSON.parse(read(LIST) ?? '[]') as unknown;
    return Array.isArray(list) ? (list as Connection[]).filter((c) => c && typeof c.id === 'string' && problems(c).length === 0) : [];
  } catch {
    return [];
  }
}

export function saveConnection(draft: ConnectionDraft, id = `c${Date.now().toString(36)}`): Connection {
  const connection: Connection = {
    id,
    name: draft.name.trim(),
    address: draft.address ? normaliseAddress(draft.address) : undefined,
    graphqlUrl: draft.graphqlUrl.trim(),
    cognitoDomain: cleanDomain(draft.cognitoDomain),
    userPoolId: draft.userPoolId.trim(),
    clientId: draft.clientId.trim(),
  };
  const list = savedConnections().filter((c) => c.id !== id);
  write(LIST, JSON.stringify([...list, connection]));
  return connection;
}

export function removeConnection(id: string): void {
  write(LIST, JSON.stringify(savedConnections().filter((c) => c.id !== id)));
  if (read(ACTIVE) === id) write(ACTIVE, null);
}

export const activeId = () => read(ACTIVE);
export const setActive = (id: string | null) => write(ACTIVE, id);
