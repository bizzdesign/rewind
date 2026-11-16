/**
 * Automation often signs in as an ordinary (NATIVE) user, such as an n8n
 * account, so origin alone can't tell it from a person. Names like these, and
 * any names or user ids in VITE_REWIND_NOT_PEOPLE (comma-separated), count as
 * accounts, not people.
 */
const AUTOMATION = /\b(n8n|bot|robot|automation|integration|import|sync|service account|system|api)\b/i;
const NOT_PEOPLE = new Set(
  (import.meta.env.VITE_REWIND_NOT_PEOPLE ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);
/** Test users: E2ETest User01, achrafTest. */
const TEST = /\be2e|test\b/i;

export const isPerson = (id: string, name: string, origin?: string) =>
  (!origin || origin === 'NATIVE') && !AUTOMATION.test(name) && !TEST.test(name) && !NOT_PEOPLE.has(name.toLowerCase()) && !NOT_PEOPLE.has(id.toLowerCase());
