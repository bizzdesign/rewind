import { type Actor, type RawData } from './types';

/**
 * Turns a year of system stamps into the numbers the story tells. Pure, so it
 * is unit-tested (rewind.test.ts) and runs the same on the demo and a tenant.
 *
 * Days, months, weekdays and hours are the viewer's local time.
 */

export type Category = 'created' | 'linked' | 'edited' | 'views' | 'tidied';
export const CATEGORIES: Category[] = ['created', 'linked', 'views', 'edited', 'tidied'];

/** The same points as Watchtower's leaderboard. */
export const POINTS: Record<Category, number> = { created: 3, views: 2, linked: 1, edited: 1, tidied: 1 };

/** An update this soon after creation (or hiding) is part of that action, not an edit. */
const SAME_ACTION_MS = 60_000;
const DAY = 864e5;

export interface Act {
  at: number;
  actor: Actor;
  kind: Category;
  id: string;
  /** Element type, for created elements. */
  type?: string;
  name?: string;
}

export interface Streak {
  days: number;
  from: number;
  to: number;
}

export interface Star {
  id: string;
  name: string;
  type: string;
  links: number;
}

export interface Rhythm {
  months: number[];
  weekdays: number[];
  hours: number[];
  /** [weekday][hour], weekday 0 = Monday. */
  heat: number[][];
  peakWeekday: number;
  peakHour: number;
  activeDays: number;
  streak?: Streak;
  busiestDay?: { day: number; count: number };
}

export interface PersonYear extends Rhythm {
  actor: Actor;
  counts: Record<Category, number>;
  points: number;
  /** 1-based, among people. */
  rank: number;
  topTypes: { type: string; count: number }[];
  /** The category where they did the biggest share of the people's work. */
  persona: Category;
  /** The element they created this year that gained the most links this year. */
  star?: Star;
  first?: { at: number; name: string; type: string };
}

export interface Award {
  title: string;
  blurb: string;
  actor: Actor;
  count: number;
  unit: string;
}

export interface Rewind extends Rhythm {
  year: number;
  start: number;
  /** End of the year, or now while it is still running. */
  end: number;
  partial: boolean;
  truncated: boolean;
  viewsFailed: boolean;
  totals: Record<Category, number>;
  addedByPeople: number;
  addedByImports: number;
  sizeStart: number;
  sizeEnd: number;
  busiestMonth: number;
  busiestDayLead?: { actor: Actor; count: number };
  topTypes: { type: string; count: number }[];
  /** Types that got their very first element this year. */
  newTypes: string[];
  headliner?: Star;
  imports: { actor: Actor; count: number }[];
  /** People only, best first. */
  people: PersonYear[];
  awards: Award[];
  first?: { at: number; name: string; type: string; actor: Actor };
}

export const yearBounds = (year: number, now = Date.now()) => {
  const start = new Date(year, 0, 1).getTime();
  const next = new Date(year + 1, 0, 1).getTime();
  return { start, end: Math.min(next, now), partial: now < next };
};

/** Local midnight of the day `at` falls on. */
export const dayOf = (at: number) => {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
/** Monday = 0. */
export const weekdayOf = (at: number) => (new Date(at).getDay() + 6) % 7;

/** More changes than this in one minute is a script, not a person. */
export const SCRIPTED_PER_MINUTE = 20;

/** Whether `actor` is, or has merged in, this user id. */
export const isActor = (actor: Actor, id: string) => actor.id === id || !!actor.ids?.includes(id);

/**
 * One actor per name: people with two accounts (password and SSO, say) count
 * once. Nameless accounts all show as "Someone", so they stay apart.
 */
function merger() {
  const byName = new Map<string, Actor>();
  return (actor: Actor): Actor => {
    if (actor.name === 'Someone') return actor;
    const key = `${actor.person ? 'p' : 'a'}:${actor.name.trim().toLowerCase().replace(/\s+/g, ' ')}`;
    const known = byName.get(key);
    if (!known) {
      const merged = { ...actor, ids: [actor.id] };
      byName.set(key, merged);
      return merged;
    }
    if (!known.ids!.includes(actor.id)) known.ids!.push(actor.id);
    return known;
  };
}

/**
 * Bulk changes made through a person's account (a script, an n8n flow) would
 * swamp the people's story. A person's changes in any minute with more than
 * SCRIPTED_PER_MINUTE of them move to a "(scripted)" account, which counts
 * like an import.
 */
function splitScripted(list: Act[]): void {
  const perMinute = new Map<string, number>();
  const key = (a: Act) => `${a.actor.id}@${Math.floor(a.at / 60_000)}`;
  for (const a of list) if (a.actor.person) perMinute.set(key(a), (perMinute.get(key(a)) ?? 0) + 1);
  const scripted = new Map<string, Actor>();
  for (const a of list) {
    if (!a.actor.person || (perMinute.get(key(a)) ?? 0) <= SCRIPTED_PER_MINUTE) continue;
    let s = scripted.get(a.actor.id);
    if (!s) scripted.set(a.actor.id, (s = { id: `${a.actor.id}#scripted`, name: `${a.actor.name} (scripted)`, person: false }));
    a.actor = s;
  }
}

/** Every counted action in the year, by anyone. */
export function acts(data: RawData, start: number, end: number): Act[] {
  const out: Act[] = [];
  const merge = merger();
  const inYear = (t: number | undefined): t is number => t !== undefined && t >= start && t < end;
  for (const e of data.elements) {
    if (inYear(e.createdAt) && e.createdBy) out.push({ at: e.createdAt, actor: e.createdBy, kind: 'created', id: e.id, type: e.type, name: e.name });
    if (inYear(e.hiddenAt) && e.hiddenBy) out.push({ at: e.hiddenAt, actor: e.hiddenBy, kind: 'tidied', id: e.id, type: e.type, name: e.name });
    const edit =
      inYear(e.updatedAt) &&
      e.updatedBy &&
      e.updatedAt - e.createdAt >= SAME_ACTION_MS &&
      (e.hiddenAt === undefined || Math.abs(e.updatedAt - e.hiddenAt) >= SAME_ACTION_MS);
    if (edit) out.push({ at: e.updatedAt, actor: e.updatedBy!, kind: 'edited', id: e.id, type: e.type, name: e.name });
  }
  for (const r of data.relations) if (inYear(r.createdAt) && r.createdBy) out.push({ at: r.createdAt, actor: r.createdBy, kind: 'linked', id: r.id });
  for (const v of data.views) if (inYear(v.createdAt) && v.createdBy) out.push({ at: v.createdAt, actor: v.createdBy, kind: 'views', id: v.id, name: v.name });
  for (const a of out) a.actor = merge(a.actor);
  splitScripted(out);
  return out.sort((a, b) => a.at - b.at);
}

const argmax = (xs: number[]) => xs.reduce((best, x, i) => (x > xs[best]! ? i : best), 0);

/** Longest run of consecutive days in a set of local midnights. */
export function longestStreak(days: Iterable<number>): Streak | undefined {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  let best: Streak | undefined;
  let from = sorted[0];
  for (let i = 0; i < sorted.length; i++) {
    const day = sorted[i]!;
    const prev = sorted[i - 1];
    // Rounding absorbs the 23- and 25-hour days around daylight saving.
    if (prev === undefined || Math.round((day - prev) / DAY) !== 1) from = day;
    const days = Math.round((day - from!) / DAY) + 1;
    if (!best || days > best.days) best = { days, from: from!, to: day };
  }
  return best;
}

export function rhythm(list: Act[]): Rhythm {
  const months = Array<number>(12).fill(0);
  const weekdays = Array<number>(7).fill(0);
  const hours = Array<number>(24).fill(0);
  const heat = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const perDay = new Map<number, number>();
  for (const a of list) {
    const d = new Date(a.at);
    months[d.getMonth()]!++;
    const wd = weekdayOf(a.at);
    weekdays[wd]!++;
    hours[d.getHours()]!++;
    heat[wd]![d.getHours()]!++;
    const day = dayOf(a.at);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  let busiestDay: Rhythm['busiestDay'];
  for (const [day, count] of perDay) if (!busiestDay || count > busiestDay.count) busiestDay = { day, count };
  return {
    months,
    weekdays,
    hours,
    heat,
    peakWeekday: argmax(weekdays),
    peakHour: argmax(hours),
    activeDays: perDay.size,
    streak: longestStreak(perDay.keys()),
    busiestDay,
  };
}

const topTypesOf = (list: Act[], n = 5) => {
  const counts = new Map<string, number>();
  for (const a of list) if (a.kind === 'created' && a.type) counts.set(a.type, (counts.get(a.type) ?? 0) + 1);
  return [...counts]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
    .slice(0, n);
};

const emptyCounts = (): Record<Category, number> => ({ created: 0, linked: 0, edited: 0, views: 0, tidied: 0 });
const pointsOf = (c: Record<Category, number>) => CATEGORIES.reduce((n, k) => n + c[k] * POINTS[k], 0);

export function buildRewind(data: RawData, year: number, now = Date.now()): Rewind {
  const { start, end, partial } = yearBounds(year, now);
  const all = acts(data, start, end);
  const byPeople = all.filter((a) => a.actor.person);

  const totals = emptyCounts();
  for (const a of all) totals[a.kind]++;
  const created = all.filter((a) => a.kind === 'created');

  const alive = (t: number) => data.elements.filter((e) => e.createdAt < t && (e.hiddenAt === undefined || e.hiddenAt >= t)).length;

  // Links gained this year, per element.
  const links = new Map<string, number>();
  for (const r of data.relations) {
    if (r.createdAt < start || r.createdAt >= end) continue;
    links.set(r.sourceId, (links.get(r.sourceId) ?? 0) + 1);
    links.set(r.targetId, (links.get(r.targetId) ?? 0) + 1);
  }
  const byId = new Map(data.elements.map((e) => [e.id, e]));
  const visibleAtEnd = (id: string) => {
    const e = byId.get(id);
    return e && (e.hiddenAt === undefined || e.hiddenAt >= end) ? e : undefined;
  };
  const starOf = (ids: Iterable<string>): Star | undefined => {
    let best: Star | undefined;
    for (const id of ids) {
      const n = links.get(id) ?? 0;
      const e = visibleAtEnd(id);
      if (e && n > 0 && (!best || n > best.links)) best = { id, name: e.name, type: e.type, links: n };
    }
    return best;
  };

  // Types that got their first element ever this year.
  const before = new Set(data.typesBefore ?? data.elements.filter((e) => e.createdAt < start).map((e) => e.type));
  const newTypes = [...new Set(created.map((a) => a.type!))].filter((t) => !before.has(t)).sort();

  const importCounts = new Map<string, { actor: Actor; count: number }>();
  for (const a of created) {
    if (a.actor.person) continue;
    const entry = importCounts.get(a.actor.id) ?? { actor: a.actor, count: 0 };
    entry.count++;
    importCounts.set(a.actor.id, entry);
  }

  // People.
  const groups = new Map<string, Act[]>();
  for (const a of byPeople) {
    const list = groups.get(a.actor.id) ?? [];
    list.push(a);
    groups.set(a.actor.id, list);
  }
  const people: PersonYear[] = [...groups.values()]
    .map((list) => {
      const counts = emptyCounts();
      for (const a of list) counts[a.kind]++;
      const mine = list.filter((a) => a.kind === 'created');
      const first = mine[0];
      return {
        ...rhythm(list),
        actor: list[0]!.actor,
        counts,
        points: pointsOf(counts),
        rank: 0,
        topTypes: topTypesOf(list),
        persona: 'created' as Category,
        star: starOf(mine.map((a) => a.id)),
        first: first ? { at: first.at, name: first.name ?? '', type: first.type ?? '' } : undefined,
      };
    })
    .sort((a, b) => b.points - a.points || b.activeDays - a.activeDays || a.actor.name.localeCompare(b.actor.name));
  people.forEach((p, i) => (p.rank = i + 1));
  // Persona: where they did the biggest share of the people's work. Raw points
  // would make nearly everyone a Builder, as new elements earn the most.
  const peopleTotals = emptyCounts();
  for (const a of byPeople) peopleTotals[a.kind]++;
  const share = (p: PersonYear, k: Category) => (peopleTotals[k] ? p.counts[k] / peopleTotals[k] : 0);
  for (const p of people) p.persona = CATEGORIES.reduce((best, k) => (share(p, k) > share(p, best) ? k : best), 'created' as Category);

  const team = rhythm(byPeople);
  const busiestDayLead = (() => {
    if (!team.busiestDay) return undefined;
    const counts = new Map<string, { actor: Actor; count: number }>();
    for (const a of byPeople) {
      if (dayOf(a.at) !== team.busiestDay.day) continue;
      const entry = counts.get(a.actor.id) ?? { actor: a.actor, count: 0 };
      entry.count++;
      counts.set(a.actor.id, entry);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count)[0];
  })();

  const firstPerson = created.find((a) => a.actor.person);

  return {
    ...team,
    year,
    start,
    end,
    partial,
    truncated: data.truncated,
    viewsFailed: !!data.viewsFailed,
    totals,
    addedByPeople: created.filter((a) => a.actor.person).length,
    addedByImports: created.filter((a) => !a.actor.person).length,
    sizeStart: data.size?.start ?? alive(start),
    sizeEnd: data.size?.end ?? alive(end),
    busiestMonth: argmax(team.months),
    busiestDayLead,
    topTypes: topTypesOf(all),
    newTypes,
    headliner: starOf(links.keys()),
    imports: [...importCounts.values()].sort((a, b) => b.count - a.count),
    people,
    awards: awards(people, byPeople),
    first: firstPerson ? { at: firstPerson.at, name: firstPerson.name ?? '', type: firstPerson.type ?? '', actor: firstPerson.actor } : undefined,
  };
}

const AWARDS: { kind: Category; title: string; blurb: string; unit: [string, string] }[] = [
  { kind: 'created', title: 'The Builder', blurb: 'most new elements', unit: ['element', 'elements'] },
  { kind: 'linked', title: 'The Connector', blurb: 'most links drawn', unit: ['link', 'links'] },
  { kind: 'views', title: 'The Storyteller', blurb: 'most views made', unit: ['view', 'views'] },
  { kind: 'edited', title: 'The Curator', blurb: 'most elements refined', unit: ['edit', 'edits'] },
  { kind: 'tidied', title: 'The Gardener', blurb: 'most tidied away', unit: ['element', 'elements'] },
];

const plural = (n: number, [one, many]: [string, string]) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;

function awards(people: PersonYear[], byPeople: Act[]): Award[] {
  const out: Award[] = [];
  for (const a of AWARDS) {
    const best = people.reduce<PersonYear | undefined>((top, p) => (p.counts[a.kind] > (top?.counts[a.kind] ?? 0) ? p : top), undefined);
    if (best) out.push({ title: a.title, blurb: a.blurb, actor: best.actor, count: best.counts[a.kind], unit: plural(best.counts[a.kind], a.unit) });
  }
  const timed = (title: string, blurb: string, when: (hour: number) => boolean) => {
    const counts = new Map<string, { actor: Actor; count: number }>();
    for (const a of byPeople) {
      if (!when(new Date(a.at).getHours())) continue;
      const entry = counts.get(a.actor.id) ?? { actor: a.actor, count: 0 };
      entry.count++;
      counts.set(a.actor.id, entry);
    }
    const best = [...counts.values()].sort((a, b) => b.count - a.count)[0];
    if (best && best.count >= 3) out.push({ title, blurb, actor: best.actor, count: best.count, unit: plural(best.count, ['change', 'changes']) });
  };
  timed('The Night Owl', 'most changes after 8 pm', (h) => h >= 20 || h < 5);
  timed('The Early Bird', 'most changes before 8 am', (h) => h >= 5 && h < 8);
  return out;
}

export const PERSONAS: Record<Category, { title: string; line: string }> = {
  created: { title: 'The Builder', line: 'You put new things on the map. When something was missing from the model, you were usually the one who added it.' },
  linked: { title: 'The Connector', line: 'You saw how things fit together. Your links turned a list of elements into a landscape.' },
  views: { title: 'The Storyteller', line: 'You turned the model into pictures people could read. Your views are how others saw the landscape.' },
  edited: { title: 'The Curator', line: 'You kept the model true. Descriptions, names and details got better because you went back to them.' },
  tidied: { title: 'The Gardener', line: 'You cleared what had grown stale, so everything else stood out.' },
};
