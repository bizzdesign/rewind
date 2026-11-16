import { type EnvValues, envJsUrl, normaliseAddress } from './connection';

/** Unify's own domains, as the SDK allows for environment addresses. Others are pasted, not run. */
export const lookupAllowed = (base: string) => /\.(unify\.cloud|bizzdesign\.dev)$/i.test(new URL(base).hostname);

/**
 * Reads a tenant's connection details straight from its address.
 *
 * Unify serves `<address>/env.js` as JavaScript without CORS headers, so it
 * can't be fetched as data from another site, but it can run as a script.
 * It runs in a sandboxed iframe (scripts only, no same-origin): a throwaway
 * page with an opaque origin that can't see Rewind's storage or sign-ins. It
 * hands back the four values Rewind needs, and nothing else, by postMessage.
 */
export function lookUpEnv(address: string, timeoutMs = 8000): Promise<EnvValues> {
  const base = normaliseAddress(address);
  if (!base) return Promise.reject(new Error('That isn’t a web address.'));
  if (!lookupAllowed(base)) return Promise.reject(new Error(`Rewind looks up addresses on unify.cloud; ${new URL(base).host} isn’t one.`));
  const src = envJsUrl(base);

  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
    const send = `(e) => parent.postMessage({ rewindEnv: e }, '*')`;
    frame.srcdoc = `<!doctype html><meta charset="utf-8">
<script>window.onerror = () => (${send})({ error: 'script' });</script>
<script src="${src.replace(/"/g, '&quot;')}" onerror="(${send.replace(/"/g, '&quot;')})({ error: 'load' })"></script>
<script>
  const c = globalThis.envConfig;
  const pick = (k) => (c && typeof c[k] === 'string' ? c[k] : undefined);
  (${send})(c ? { appSyncUrl: pick('appSyncUrl'), cognitoDomain: pick('cognitoDomain'), cognitoUserPoolId: pick('cognitoUserPoolId'), cognitoClientId: pick('cognitoClientId') } : { error: 'missing' });
</script>`;

    const done = () => {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      frame.remove();
    };
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.contentWindow) return;
      const data = (e.data as { rewindEnv?: EnvValues & { error?: string } } | undefined)?.rewindEnv;
      if (!data) return;
      done();
      if (data.error) {
        reject(
          new Error(
            data.error === 'load'
              ? `Couldn’t load ${src}. Check the address: it’s the one you open Unify on.`
              : `${src} didn’t contain Unify’s connection details.`,
          ),
        );
        return;
      }
      // Only plain strings come back; a stray value is dropped rather than trusted.
      const text = (v: unknown) => (typeof v === 'string' && v.length < 300 ? v : undefined);
      resolve({
        appSyncUrl: text(data.appSyncUrl),
        cognitoDomain: text(data.cognitoDomain),
        cognitoUserPoolId: text(data.cognitoUserPoolId),
        cognitoClientId: text(data.cognitoClientId),
      });
    };
    const timer = window.setTimeout(() => {
      done();
      reject(new Error(`No answer from ${src}.`));
    }, timeoutMs);
    window.addEventListener('message', onMessage);
    document.body.append(frame);
  });
}
