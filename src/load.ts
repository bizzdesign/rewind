import { type SystemAttributesFilter, type UUID, formatDateString } from '@bizzdesign/sdk-bundle/browser';
import { isPerson } from './accounts';
import { type Paged, readAll } from './paging';
import { type Kg, OBJECT_TYPES, personName } from './sdk';
import { type Actor, type Progress, type RawData, type RawElement, type RawRelation, type RawView, type Source } from './types';

/**
 * Every read the app makes. All of them are reads: Rewind never writes to the
 * tenant. Only system stamps are selected (created, edited, hidden, by whom),
 * never attribute values or view content.
 *
 * Only the year is read in full: elements created, edited or hidden in it,
 * links and views made in it. The model's size on 1 January and which types
 * already existed come from counts, which cost no data.
 */

/** Per list. */
export const CAP = 40_000;
/** Elements looked up by id when they gained the most links but weren't touched this year. */
const HEADLINER_CANDIDATES = 25;

type User = { userId?: string; firstName?: string; lastName?: string; email?: string; origin?: string } | undefined | null;

const who = (u: User): Actor | undefined => {
  if (!u?.userId) return undefined;
  const name = personName(u);
  return { id: u.userId, name, person: isPerson(u.userId, name, u.origin) };
};

const ms = (d: Date | string | undefined | null) => (d ? new Date(d).getTime() : undefined);

export async function loadYear(kg: Kg, year: number, onProgress: (p: Progress) => void): Promise<RawData> {
  const start = new Date(year, 0, 1);
  const end = new Date(Math.min(new Date(year + 1, 0, 1).getTime(), Date.now()));
  const from = formatDateString(start)!;
  const to = formatDateString(end)!;
  const inYear = [
    { operator: 'greaterThanOrEquals' as const, expression: { value: from } },
    { operator: 'lessThan' as const, expression: { value: to } },
  ];
  const before = (t: string) => [{ operator: 'lessThan' as const, expression: { value: t } }];
  const atOrAfter = (t: string) => [{ operator: 'greaterThanOrEquals' as const, expression: { value: t } }];

  const elements = new Map<string, RawElement>();
  const relations: RawRelation[] = [];
  const views: RawView[] = [];
  let truncated = false;
  let viewsFailed = false;
  const expected = { elements: 0, relations: 0 };
  let last = 0;
  const tick = (force = false) => {
    const now = performance.now();
    if (force || now - last > 120) {
      last = now;
      onProgress({ elements: elements.size, relations: relations.length, views: views.length, expected: { ...expected } });
    }
  };

  const objects = (systemAttributesFilter: SystemAttributesFilter, types: string[] = OBJECT_TYPES) =>
    kg.getObjects({ filter: { types: types as typeof OBJECT_TYPES, systemAttributesFilter }, selector: { systemAttributes: true } });

  type Obj = { id: string; name: string; type: string; systemAttributes: Stamps };
  const addElement = (o: Obj) => {
    if (!elements.has(o.id)) elements.set(o.id, toElement(o));
    tick();
  };
  // Pages of 2,000, four at a time, halved on failure: see paging.ts for the measurements.
  const read = async <T,>(result: Paged<T>, each: (item: T) => void, kind: keyof typeof expected) => {
    if (await readAll(result, each, { cap: CAP, onTotal: (n) => (expected[kind] += n) })) truncated = true;
  };
  const count = (filter: SystemAttributesFilter, types?: string[]) => objects(filter, types).getCount();

  type V = { id: string; name: string; systemAttributes: { createdAt: Date | string; createdBy?: User } };
  const addView = (v: V) => {
    const createdAt = ms(v.systemAttributes.createdAt)!;
    if (createdAt < start.getTime() || createdAt >= end.getTime()) return;
    views.push({ id: v.id, name: v.name, createdAt, createdBy: who(v.systemAttributes.createdBy) });
    tick();
  };
  /**
   * Views matter least, so they never sink the story. Some backends (a Bizzdesign test environment,
   * Nov 2026) fail on a dated view filter; then every view is streamed and dated
   * here, and if that fails too the story goes on without views.
   */
  async function readViews(): Promise<void> {
    try {
      const total = await kg.getViews({ filter: { systemAttributes: { createdAt: inYear } }, selector: { systemAttributes: true } }).getCount();
      for await (const v of kg.getViews({ filter: { systemAttributes: { createdAt: inYear } }, selector: { systemAttributes: true } }).stream()) addView(v as unknown as V);
      if (total > CAP) truncated = true;
      return;
    } catch {
      views.length = 0;
    }
    try {
      for await (const v of kg.getViews({ filter: {}, selector: { systemAttributes: true } }).stream()) {
        addView(v as unknown as V);
        if (views.length >= CAP) {
          truncated = true;
          break;
        }
      }
    } catch {
      views.length = 0;
      viewsFailed = true;
    }
  }

  const [sizeStart, sizeEnd] = await Promise.all([
    // Visible on a date: created before it, and not hidden, or hidden only later.
    Promise.all([count({ hidden: 'NOT_HIDDEN', createdAt: before(from) }), count({ hidden: 'HIDDEN', createdAt: before(from), hiddenAt: atOrAfter(from) })]).then(([a, b]) => a + b),
    Promise.all([count({ hidden: 'NOT_HIDDEN', createdAt: before(to) }), count({ hidden: 'HIDDEN', createdAt: before(to), hiddenAt: atOrAfter(to) })]).then(([a, b]) => a + b),
    // Created this year (their edit and hide stamps come along), then older elements edited or hidden this year.
    read(objects({ hidden: 'ALL', createdAt: inYear }) as unknown as Paged<Obj>, addElement, 'elements'),
    read(objects({ hidden: 'ALL', createdAt: before(from), updatedAt: inYear }) as unknown as Paged<Obj>, addElement, 'elements'),
    read(objects({ hidden: 'HIDDEN', createdAt: before(from), hiddenAt: inYear }) as unknown as Paged<Obj>, addElement, 'elements'),
    read(
      kg.getRelations({
        // Both ends known types: the SDK throws when it maps an endpoint of a type it doesn't know (BDCore.ValueStream on a Bizzdesign test environment).
        filter: { sourceFilter: { types: OBJECT_TYPES }, targetFilter: { types: OBJECT_TYPES }, systemAttributesFilter: { hidden: 'ALL', createdAt: inYear } },
        selector: { systemAttributes: true, source: true, target: true },
      }) as unknown as Paged<{ id: string; source?: { id: string }; target?: { id: string }; systemAttributes?: { createdAt: Date | string; createdBy?: User } }>,
      (r) => {
        const a = r.systemAttributes;
        if (!a || !r.source || !r.target) return;
        relations.push({ id: r.id, sourceId: r.source.id, targetId: r.target.id, createdAt: ms(a.createdAt)!, createdBy: who(a.createdBy) });
        tick();
      },
      'relations',
    ),
    readViews(),
  ]);

  // Which of this year's types already had an element before 1 January: one count each.
  // The backend can be ahead of the SDK (a test environment has BDCore.ValueStream, which SDK 8.2.2
  // refuses in a filter), so a type the SDK doesn't know is skipped and never called new,
  // and a count that fails counts as "existed": this check must not sink the year.
  const known = new Set<string>(OBJECT_TYPES);
  const yearTypes = [...new Set([...elements.values()].filter((e) => e.createdAt >= start.getTime()).map((e) => e.type))];
  const typesBefore = (
    await Promise.all(
      yearTypes.map(async (t) => {
        if (!known.has(t)) return t;
        try {
          return (await count({ hidden: 'ALL', createdAt: before(from) }, [t])) > 0 ? t : undefined;
        } catch {
          return t;
        }
      }),
    )
  ).filter((t): t is string => !!t);

  // The headliner may be an older element nobody touched this year: look up the likeliest ones by id.
  const links = new Map<string, number>();
  for (const r of relations) for (const id of [r.sourceId, r.targetId]) links.set(id, (links.get(id) ?? 0) + 1);
  const missing = [...links]
    .filter(([id]) => !elements.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, HEADLINER_CANDIDATES)
    .map(([id]) => id);
  // Known types only: the SDK throws on mapping a type it doesn't know (BDCore.ValueStream on
  // a test environment), and without a types filter the lookup can return one. The headliner is a
  // nice-to-have, so a failure here leaves it to the elements already read.
  if (missing.length)
    try {
      const filter = { ids: missing as UUID[], types: OBJECT_TYPES, systemAttributesFilter: { hidden: 'ALL' as const } };
      for await (const o of kg.getObjects({ filter, selector: { systemAttributes: true } }).stream()) addElement(o as unknown as Obj);
    } catch {
      // Keep what was read.
    }

  tick(true);
  return { elements: [...elements.values()], relations, views, truncated, viewsFailed, size: { start: sizeStart, end: sizeEnd }, typesBefore };
}

interface Stamps {
  createdAt: Date | string;
  createdBy?: User;
  updatedAt?: Date | string;
  updatedBy?: User;
  isHidden?: boolean;
  hiddenAt?: Date | string;
  hiddenBy?: User;
}

function toElement(o: { id: string; name: string; type: string; systemAttributes: Stamps }): RawElement {
  const a = o.systemAttributes;
  return {
    id: o.id,
    name: o.name,
    type: o.type,
    createdAt: ms(a.createdAt)!,
    createdBy: who(a.createdBy),
    updatedAt: ms(a.updatedAt) ?? ms(a.createdAt)!,
    updatedBy: who(a.updatedBy),
    hiddenAt: a.isHidden ? ms(a.hiddenAt) : undefined,
    hiddenBy: a.isHidden ? who(a.hiddenBy) : undefined,
  };
}

export const tenantSource = (kg: Kg, label: string, me?: string): Source => ({
  label,
  demo: false,
  me,
  load: (year, onProgress) => loadYear(kg, year, onProgress),
});
