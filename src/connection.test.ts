import { describe, expect, it } from 'vitest';
import { envJsUrl, normaliseAddress, parseEnvJs, problems, realtimeOf, redirectUrl, regionOf, suggestName } from './connection';

const ENV_JS = `globalThis.envConfig = {
  appSyncUrl: 'https://acme-api.unify.cloud/graphql',
  appSyncRealtimeUrl: 'wss://acme-api.unify.cloud/graphql/realtime',
  cognitoRegion: 'eu-west-1',
  cognitoDomain: 'acme-auth.unify.cloud',
  cognitoUserPoolId: 'eu-west-1_Ex4mpLe12',
  cognitoClientId: '1ab2cd3ef4gh5ij6kl7mn8op9q',
};`;

describe('parseEnvJs', () => {
  it('reads the values Rewind needs from a pasted env.js', () => {
    expect(parseEnvJs(ENV_JS)).toEqual({
      appSyncUrl: 'https://acme-api.unify.cloud/graphql',
      cognitoDomain: 'acme-auth.unify.cloud',
      cognitoUserPoolId: 'eu-west-1_Ex4mpLe12',
      cognitoClientId: '1ab2cd3ef4gh5ij6kl7mn8op9q',
    });
  });

  it('takes JSON or a bare object too, and ignores what comes before the marker', () => {
    expect(parseEnvJs('{"appSyncUrl": "https://x-api.unify.cloud/graphql", "cognitoUserPoolId": "eu-central-1_Ab"}')).toMatchObject({
      appSyncUrl: 'https://x-api.unify.cloud/graphql',
      cognitoUserPoolId: 'eu-central-1_Ab',
    });
    expect(parseEnvJs(`var appSyncUrl: 'nope'; ${ENV_JS}`).appSyncUrl).toBe('https://acme-api.unify.cloud/graphql');
  });

  it('finds nothing in text that is not env.js', () => {
    expect(parseEnvJs('<html>Not found</html>')).toEqual({ appSyncUrl: undefined, cognitoDomain: undefined, cognitoUserPoolId: undefined, cognitoClientId: undefined });
  });
});

it('reads a production env.js, with nested settings and an amazoncognito.com sign-in domain', () => {
  const env = `globalThis.envConfig = {
  production: true,
  cognitoRegion: 'eu-central-1',
  cognitoDomain: 'bizzdesign-auth-acme.auth.eu-central-1.amazoncognito.com',
  cognitoUserPoolId: 'eu-central-1_Ex4mpLe34',
  cognitoClientId: '9zy8xw7vu6ts5rq4po3nm2lk1j',
  appSyncUrl: 'https://acme.api.svc.unify.cloud/graphql',
  batchImport: {
    parallelRequests: 5,
  },
};`;
  const v = parseEnvJs(env);
  expect(v).toEqual({
    appSyncUrl: 'https://acme.api.svc.unify.cloud/graphql',
    cognitoDomain: 'bizzdesign-auth-acme.auth.eu-central-1.amazoncognito.com',
    cognitoUserPoolId: 'eu-central-1_Ex4mpLe34',
    cognitoClientId: '9zy8xw7vu6ts5rq4po3nm2lk1j',
  });
  expect(problems({ name: 'Acme', graphqlUrl: v.appSyncUrl, cognitoDomain: v.cognitoDomain, userPoolId: v.cognitoUserPoolId, clientId: v.cognitoClientId })).toEqual([]);
});

describe('addresses', () => {
  it('normalises what people type', () => {
    expect(normaliseAddress('acme.unify.cloud')).toBe('https://acme.unify.cloud');
    expect(normaliseAddress(' https://acme.unify.cloud/some/page?x=1 ')).toBe('https://acme.unify.cloud');
    expect(normaliseAddress('not an address')).toBeUndefined();
    expect(envJsUrl('acme.unify.cloud')).toBe('https://acme.unify.cloud/env.js');
  });

  it('suggests a name from the host', () => {
    expect(suggestName('https://acme.unify.cloud', undefined)).toBe('acme');
    expect(suggestName(undefined, 'https://acme-api.unify.cloud/graphql')).toBe('acme');
  });

  it('derives the region and the realtime address', () => {
    expect(regionOf('eu-west-1_Ex4mpLe12')).toBe('eu-west-1');
    expect(realtimeOf('https://acme-api.unify.cloud/graphql')).toBe('wss://acme-api.unify.cloud/graphql/realtime');
  });

  it('builds the redirect URL Cognito must know: the bare origin at the root, origin and path below it', () => {
    expect(redirectUrl('http://localhost:4200', '/')).toBe('http://localhost:4200');
    expect(redirectUrl('https://example.org', '/rewind/')).toBe('https://example.org/rewind/');
  });
});

describe('problems', () => {
  const good = {
    name: 'Acme',
    graphqlUrl: 'https://acme-api.unify.cloud/graphql',
    cognitoDomain: 'acme-auth.unify.cloud',
    userPoolId: 'eu-west-1_Ex4mpLe12',
    clientId: '1ab2cd3ef4gh5ij6kl7mn8op9q',
  };

  it('accepts a complete connection, with or without a scheme on the domain', () => {
    expect(problems(good)).toEqual([]);
    expect(problems({ ...good, cognitoDomain: 'https://acme-auth.unify.cloud/' })).toEqual([]);
  });

  it('says what is missing', () => {
    expect(problems({ ...good, clientId: '' })).toEqual([expect.stringContaining('app client ID')]);
    expect(problems({ ...good, userPoolId: 'nope' })).toEqual([expect.stringContaining('user pool ID')]);
    expect(problems({ ...good, graphqlUrl: 'http://x/graphql' })).toEqual([expect.stringContaining('https')]);
    expect(problems({})).toHaveLength(5);
  });
});
