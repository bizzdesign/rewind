import { type Actor, type RawData, type RawElement, type RawRelation, type RawView, type Source } from './types';

/**
 * A made-up tenant with two and a bit years of history, so anyone can play a
 * Rewind without signing in (and the explorer gate has something to click).
 * This year has a story in it: a ServiceNow import in February, a modelling
 * workshop in March, a clean-up in September, a night owl and an early bird.
 * Seeded, so the same day always gives the same numbers.
 */

const DAY = 864e5;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Persona {
  actor: Actor;
  /** Relative amount of work. */
  weight: number;
  /** Hour they work around. */
  peak: number;
  /** Share of [create, link, edit, view] in what they do. */
  mix: [number, number, number, number];
}

const p = (id: string, name: string, weight: number, peak: number, mix: Persona['mix']): Persona => ({ actor: { id, name, person: true }, weight, peak, mix });

const PEOPLE: Persona[] = [
  p('u-anna', 'Anna de Vries', 5, 10, [45, 35, 15, 5]),
  p('u-sam', 'Sam Okafor', 4, 14, [20, 30, 48, 2]),
  p('u-priya', 'Priya Raman', 4, 11, [30, 55, 13, 2]),
  p('u-jonas', 'Jonas Becker', 3, 15, [40, 40, 18, 2]),
  p('u-lea', 'Léa Martin', 2.5, 10, [25, 25, 20, 30]),
  p('u-tom', 'Tom Hendriks', 2, 7, [35, 40, 23, 2]),
  p('u-mei', 'Mei Chen', 2, 22, [40, 40, 18, 2]),
  p('u-omar', 'Omar Haddad', 1.2, 13, [35, 45, 18, 2]),
  p('u-sofia', 'Sofia Rossi', 0.8, 9, [30, 50, 18, 2]),
];
const SERVICENOW: Actor = { id: 'u-servicenow', name: 'ServiceNow import', person: false };
const LEANIX: Actor = { id: 'u-leanix', name: 'LeanIX sync', person: false };

const T = (s: string) => `BDCore.${s}`;
/** Goal and Initiative only appear this year, so the story can say "first ever". */
const TYPES: [string, number, boolean][] = [
  [T('Application'), 26, false],
  [T('Capability'), 14, false],
  [T('Process'), 12, false],
  [T('Data'), 10, false],
  [T('SoftwareTechnology'), 10, false],
  [T('HardwareTechnology'), 4, false],
  [T('Organization'), 5, false],
  [T('Product'), 4, false],
  [T('Goal'), 3, true],
  [T('Initiative'), 4, true],
];

const WORDS: Record<string, [string[], string[]]> = {
  Application: [
    ['Pay', 'Order', 'Cust', 'Ledger', 'Flex', 'Nova', 'Atlas', 'Pulse', 'Core', 'Quick', 'Claims', 'Policy', 'Fleet', 'Sales', 'Talent', 'Stock', 'Route', 'Lumen', 'Vault'],
    ['Hub', 'Desk', 'Portal', 'Engine', 'Suite', 'Connect', 'Tracker', 'Manager', 'Gateway', 'Flow', '360', 'Pro', 'Base', 'Point'],
  ],
  Capability: [
    ['Customer', 'Order', 'Payment', 'Risk', 'Product', 'Partner', 'Workforce', 'Asset', 'Finance', 'Supply', 'Pricing', 'Claims', 'Identity', 'Data'],
    ['Management', 'Onboarding', 'Analytics', 'Planning', 'Fulfilment', 'Compliance', 'Engagement', 'Governance', 'Operations'],
  ],
  Process: [
    ['Handle', 'Approve', 'Register', 'Invoice', 'Ship', 'Review', 'Renew', 'Close', 'Assess', 'Settle', 'Onboard'],
    ['claim', 'order', 'customer', 'supplier', 'contract', 'payment', 'return', 'request', 'employee', 'policy'],
  ],
  Data: [['Customer', 'Order', 'Invoice', 'Product', 'Employee', 'Contract', 'Payment', 'Shipment', 'Policy', 'Claim'], ['record', 'master data', 'history', 'ledger', 'catalogue']],
  SoftwareTechnology: [['PostgreSQL', 'Kafka', 'Redis', 'Kubernetes', 'Java', 'Node.js', 'Oracle DB', 'SAP HANA', 'Elastic', 'RabbitMQ', 'Spark'], ['', ' cluster', ' runtime', ' 2']],
  HardwareTechnology: [['Edge', 'Core', 'DC', 'Branch', 'Lab'], ['server', 'router', 'firewall', 'storage array', 'gateway']],
  Organization: [['Finance', 'Sales', 'HR', 'IT', 'Operations', 'Legal', 'Marketing', 'Procurement', 'Customer Service'], ['', ' EMEA', ' Americas', ' APAC', ' team']],
  Product: [['Home', 'Travel', 'Car', 'Business', 'Pet', 'Life', 'Health'], [' insurance', ' cover', ' plus', ' basic', ' premium']],
  Goal: [['Halve', 'Grow', 'Cut', 'Double', 'Simplify', 'Raise'], [' onboarding time', ' digital sales', ' IT cost', ' NPS', ' the landscape', ' straight-through processing']],
  Initiative: [['Project', 'Programme', 'Wave'], [' Phoenix', ' Northstar', ' Cloud First', ' One Customer', ' Clean Core', ' Lighthouse', ' Atlas']],
};

const QUALIFIERS = ['NL', 'DE', 'UK', 'FR', 'Nordics', 'EU', 'US', 'Legacy', 'Cloud', 'Next', 'Lite', 'Retail', 'Wholesale', 'Group', 'v2', 'Online'];

const VIEW_NAMES = ['Application landscape', 'Capability map', 'Customer journey', 'Integration overview', 'Data lineage', 'Technology radar', 'Target architecture', 'Roadmap', 'Org chart', 'Process overview', 'Product portfolio', 'Risk heatmap'];
const VIEW_SCOPES = ['Finance', 'Sales', 'HR', 'Claims', 'Payments', 'Cloud', 'EMEA', '2027', 'as-is', 'to-be', 'Phoenix', 'Northstar'];

export function demoData(now = Date.now()): RawData {
  const r = rng(20261231);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
  const year = new Date(now).getFullYear();
  const begin = new Date(year - 2, 0, 1).getTime();
  const thisYear = new Date(year, 0, 1).getTime();

  const elements: RawElement[] = [];
  const relations: RawRelation[] = [];
  const views: RawView[] = [];
  const names = new Set<string>();
  /** Visible elements, for linking; a few become hubs because links attract links. */
  const pool: RawElement[] = [];
  const pulls: number[] = [];

  const nameFor = (type: string) => {
    const [a, b] = WORDS[type.slice(7)] ?? [['Element'], ['']];
    for (let i = 0; i < 20; i++) {
      const name = `${pick(a)}${type === T('Application') ? '' : ' '}${pick(b)}`.replace(/\s+/g, ' ').trim();
      if (!names.has(name)) {
        names.add(name);
        return name;
      }
    }
    // Landscapes repeat names across regions and generations; so does the demo before it resorts to numbers.
    for (let i = 0; i < 40; i++) {
      const name = `${pick(a)}${type === T('Application') ? '' : ' '}${pick(b)} ${pick(QUALIFIERS)}`.replace(/\s+/g, ' ').trim();
      if (!names.has(name)) {
        names.add(name);
        return name;
      }
    }
    const name = `${pick(a)} ${pick(b)} ${names.size}`.replace(/\s+/g, ' ').trim();
    names.add(name);
    return name;
  };

  const typeAt = (t: number) => {
    const types = TYPES.filter(([, , fresh]) => !fresh || t >= thisYear);
    let x = r() * types.reduce((n, [, w]) => n + w, 0);
    for (const [type, w] of types) if ((x -= w) < 0) return type;
    return types[0]![0];
  };

  const create = (t: number, by: Actor, type = typeAt(t), name = nameFor(type)) => {
    const e: RawElement = { id: `e${elements.length}`, name, type, createdAt: t, createdBy: by, updatedAt: t, updatedBy: by };
    elements.push(e);
    pool.push(e);
    pulls.push(1);
    return e;
  };

  const target = () => {
    // Preferential attachment: well-linked elements attract more links.
    let x = r() * pulls.reduce((n, w) => n + w, 0);
    for (let i = 0; i < pool.length; i++) if ((x -= pulls[i]!) < 0) return i;
    return pool.length - 1;
  };

  const link = (t: number, by: Actor, from?: RawElement) => {
    if (pool.length < 2) return;
    const i = target();
    const source = from ?? pool[Math.floor(r() * pool.length)]!;
    const to = pool[i]!;
    if (source === to) return;
    relations.push({ id: `r${relations.length}`, sourceId: source.id, targetId: to.id, createdAt: t, createdBy: by });
    pulls[i]! += 1.4;
  };

  // A hub everyone ends up linking to.
  const hub = create(begin + 3 * DAY + 10 * 36e5, PEOPLE[0]!.actor, T('Application'), 'Customer Portal');
  pulls[0] = 40;

  const hourFor = (peak: number) => Math.max(0, Math.min(23.9, peak + (r() + r() + r() - 1.5) * 3));

  for (let day = begin; day < now; day += DAY) {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    const midnight = d.getTime();
    const weekday = (d.getDay() + 6) % 7;
    const weekend = weekday >= 5;
    const inThisYear = midnight >= thisYear;
    const month = d.getMonth();
    const date = d.getDate();
    // A modelling workshop in mid-March this year; quieter summers and Christmas.
    const workshop = inThisYear && month === 2 && date >= 17 && date <= 19;
    const season = workshop ? 4 : month === 7 ? 0.45 : (month === 11 && date > 20) || (month === 0 && date === 1) ? 0.25 : 1;
    // Busier each year, and Tuesdays and Wednesdays most of all.
    const growth = 0.55 + 0.25 * (d.getFullYear() - (year - 2));
    const dayFactor = [1, 1.25, 1.2, 1, 0.75, 0.12, 0.05][weekday]!;

    for (const person of PEOPLE) {
      const owl = person.actor.id === 'u-mei';
      const activeChance = Math.min(0.95, 0.18 * person.weight * (weekend && owl ? 3 : 1) * dayFactor * season * growth);
      if (r() > activeChance) continue;
      const n = Math.max(1, Math.round((1 + r() * 4) * Math.sqrt(person.weight) * (workshop ? 3 : 1)));
      for (let k = 0; k < n; k++) {
        const t = midnight + hourFor(person.peak) * 36e5 + Math.floor(r() * 60) * 1000;
        if (t >= now) continue;
        let x = r() * 100;
        const [c, l, e] = person.mix;
        if ((x -= c) < 0) {
          const made = create(t, person.actor);
          if (r() < 0.7) link(t + 30_000, person.actor, made);
        } else if ((x -= l) < 0) {
          link(t, person.actor);
        } else if ((x -= e) < 0) {
          const old = pool[Math.floor(r() * pool.length)];
          if (old && t - old.createdAt > 60_000) Object.assign(old, { updatedAt: t, updatedBy: person.actor });
        } else {
          views.push({ id: `v${views.length}`, name: `${pick(VIEW_NAMES)} – ${pick(VIEW_SCOPES)}`, createdAt: t, createdBy: person.actor });
        }
      }
    }

    // LeanIX syncs a handful of technologies on the first of each month.
    if (date === 1) for (let k = 0; k < 4 + Math.floor(r() * 10); k++) create(midnight + 3 * 36e5 + k * 1000, LEANIX, T('SoftwareTechnology'));
    // ServiceNow import: one big batch in early February this year.
    if (inThisYear && month === 1 && date === 3)
      for (let k = 0; k < 380; k++) {
        const e = create(midnight + 2 * 36e5 + k * 500, SERVICENOW, r() < 0.8 ? T('Application') : T('SoftwareTechnology'));
        if (r() < 0.3) link(e.createdAt + 200, SERVICENOW, e);
      }
    // The September clean-up: Priya tidies away duplicates and stale imports.
    if (inThisYear && month === 8 && date >= 14 && date <= 18 && !weekend) {
      for (let k = 0; k < 30; k++) {
        const candidates = pool.filter((e) => e.createdBy?.person === false || r() < 0.02);
        const victim = candidates[Math.floor(r() * candidates.length)];
        if (!victim || victim === hub) continue;
        const t = midnight + hourFor(11) * 36e5;
        Object.assign(victim, { hiddenAt: t, hiddenBy: PEOPLE[2]!.actor, updatedAt: t, updatedBy: PEOPLE[2]!.actor });
        const i = pool.indexOf(victim);
        pool.splice(i, 1);
        pulls.splice(i, 1);
      }
    }
  }

  return { elements, relations, views, truncated: false };
}

export function demoSource(): Source {
  let cached: RawData | undefined;
  return {
    label: 'demo',
    demo: true,
    me: 'u-anna',
    async load(year, onProgress) {
      cached ??= demoData();
      const start = new Date(year, 0, 1).getTime();
      const end = new Date(year + 1, 0, 1).getTime();
      const data = { ...cached, relations: cached.relations.filter((x) => x.createdAt >= start && x.createdAt < end) };
      // A short pause, so the loading screen isn't a flash.
      for (const share of [0.3, 0.7, 1]) {
        onProgress({ elements: Math.round(data.elements.length * share), relations: Math.round(data.relations.length * share), views: Math.round(data.views.length * share) });
        await new Promise((resolve) => setTimeout(resolve, 220));
      }
      return data;
    },
  };
}
