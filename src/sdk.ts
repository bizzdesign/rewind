import { BDCore, type Config, TokenTypes, sdkFactory } from '@bizzdesign/sdk-bundle/browser';
import { type Connection, realtimeOf, redirectUrl, regionOf } from './connection';

const env = import.meta.env;

export type ObjectType = BDCore.ObjectType;

export const OBJECT_TYPES = [...BDCore.objectTypes] as ObjectType[];

/** `BDCore.SoftwareTechnology` → `Software Technology`, as the metamodel labels it. */
export const typeLabel = (type: string): string =>
  (BDCore.objectTypes as readonly string[]).includes(type)
    ? BDCore.labelForElement(type as ObjectType)
    : type.slice(type.lastIndexOf('.') + 1).replace(/([a-z])([A-Z])/g, '$1 $2');

/**
 * The developer's .env as a connection (VITE_UNIFY_GRAPHQL_URL and the Cognito
 * values), so local development needs no form. A hosted build has no .env and
 * starts from the connection screen.
 */
export function builtInConnection(): Connection | undefined {
  if (!env.VITE_UNIFY_GRAPHQL_URL || !env.VITE_COGNITO_DOMAIN || !env.VITE_COGNITO_USER_POOL_ID || !env.VITE_COGNITO_CLIENT_ID) return undefined;
  const graphqlUrl = env.VITE_UNIFY_GRAPHQL_URL;
  return {
    id: 'env',
    name: `${new URL(graphqlUrl).hostname.split('.')[0]!.replace(/-api$/, '')} (.env)`,
    graphqlUrl,
    cognitoDomain: env.VITE_COGNITO_DOMAIN,
    userPoolId: env.VITE_COGNITO_USER_POOL_ID,
    clientId: env.VITE_COGNITO_CLIENT_ID,
    builtIn: true,
  };
}

/** Where Cognito sends people back after signing in: this page, under GitHub Pages' path when there is one. */
export const callbackUrl = () => redirectUrl(globalThis.location.origin, import.meta.env.BASE_URL);

function buildConfig(c: Connection): Config {
  return {
    graphqlEndpoint: c.graphqlUrl,
    graphqlRealtimeEndpoint: realtimeOf(c.graphqlUrl),
    authentication: {
      type: 'cognito-user',
      cognito: {
        region: regionOf(c.userPoolId),
        endpoint: c.cognitoDomain,
        callbackUrl: callbackUrl(),
        userPoolId: c.userPoolId,
        clientId: c.clientId,
      },
    },
    useTokenType: TokenTypes.ACCESS_TOKEN,
    logSettings: { minimumLogLevel: 'warn' },
    // Off: a batch is one request that waits for its slowest query, which turned the loader's parallel pages into a queue.
    queryBatching: { enabled: false },
  } as Config;
}

export type Sdk = ReturnType<typeof sdkFactory>;
export type Kg = ReturnType<Sdk['knowledgeGraphClient']>;

let sdk: Sdk | undefined;

/** The one SDK instance for this page's connection, signed in, and who is signed in. Redirects to the tenant's sign-in page when there is no session. */
export async function connect(c: Connection): Promise<{ kg: Kg; me?: string }> {
  sdk ??= sdkFactory(buildConfig(c));
  await sdk.ensureAuthenticated();
  let me: string | undefined;
  try {
    me = (await sdk.authClient.getAuthenticatedUser()).userId;
  } catch {
    // Without it the personal story just starts from the people picker.
  }
  return { kg: sdk.knowledgeGraphClient('BDCore'), me };
}

/** Signs out of the tenant (its sign-out URL list must include this page) and comes back here. */
export async function signOut(): Promise<void> {
  await sdk?.authClient.logout();
}

export function personName(user: { firstName?: string; lastName?: string; email?: string } | undefined | null): string {
  if (!user) return 'Someone';
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return full || user.email || 'Someone';
}

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
