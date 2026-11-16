import { describe, expect, it } from 'vitest';
import { buildRewind, dayOf, longestStreak, weekdayOf } from './rewind';
import { type Actor, type RawData, type RawElement } from './types';

const anna: Actor = { id: 'anna', name: 'Anna', person: true };
const sam: Actor = { id: 'sam', name: 'Sam', person: true };
const sync: Actor = { id: 'sync', name: 'ServiceNow import', person: false };

/** Local time, so the tests hold in any time zone. */
const at = (m: number, d: number, h = 10, min = 0) => new Date(2026, m - 1, d, h, min).getTime();

const el = (id: string, type: string, createdAt: number, createdBy: Actor, extra: Partial<RawElement> = {}): RawElement => ({
  id,
  name: id.toUpperCase(),
  type,
  createdAt,
  createdBy,
  updatedAt: createdAt,
  updatedBy: createdBy,
  ...extra,
});

function data(): RawData {
  return {
    elements: [
      el('old', 'BDCore.Application', new Date(2025, 5, 1).getTime(), anna),
      el('gone', 'BDCore.Application', new Date(2025, 5, 2).getTime(), anna, { hiddenAt: at(9, 1), hiddenBy: sam, updatedAt: at(9, 1), updatedBy: sam }),
      el('a1', 'BDCore.Application', at(3, 2), anna, { updatedAt: at(4, 1), updatedBy: sam }),
      el('a2', 'BDCore.Application', at(3, 2, 11), anna),
      el('c1', 'BDCore.Capability', at(3, 3), sam),
      el('g1', 'BDCore.Goal', at(3, 4, 22), sam),
      el('imp1', 'BDCore.Application', at(2, 1), sync),
      el('imp2', 'BDCore.Application', at(2, 1), sync),
      el('next', 'BDCore.Application', new Date(2027, 0, 2).getTime(), anna),
    ],
    relations: [
      { id: 'r1', sourceId: 'a1', targetId: 'c1', createdAt: at(3, 5), createdBy: sam },
      { id: 'r2', sourceId: 'a2', targetId: 'c1', createdAt: at(3, 5), createdBy: sam },
      { id: 'r3', sourceId: 'old', targetId: 'c1', createdAt: at(3, 6), createdBy: anna },
    ],
    views: [{ id: 'v1', name: 'Landscape', createdAt: at(3, 7), createdBy: anna }],
    truncated: false,
  };
}

const NOW = new Date(2026, 10, 10).getTime();

describe('buildRewind', () => {
  const r = buildRewind(data(), 2026, NOW);

  it('counts the year only, and tells people from imports', () => {
    expect(r.totals).toEqual({ created: 6, linked: 3, views: 1, edited: 1, tidied: 1 });
    expect(r.addedByPeople).toBe(4);
    expect(r.addedByImports).toBe(2);
    expect(r.imports.map((x) => [x.actor.id, x.count])).toEqual([[sync.id, 2]]);
    expect(r.partial).toBe(true);
  });

  it('sizes the model at both ends of the year', () => {
    expect(r.sizeStart).toBe(2);
    // 2 old, 1 hidden in September, 6 new.
    expect(r.sizeEnd).toBe(7);
  });

  it('finds the headliner among elements still visible', () => {
    expect(r.headliner).toMatchObject({ id: 'c1', links: 3 });
  });

  it('notices types that got their first element this year', () => {
    expect(r.newTypes).toEqual(['BDCore.Capability', 'BDCore.Goal']);
  });

  it('ranks people by points and gives each a persona', () => {
    // Anna: 2 created (6) + 1 link + 1 view (2) = 9. Sam: 2 created (6) + 2 links + 1 edit + 1 tidied = 10.
    expect(r.people.map((p) => [p.actor.id, p.points, p.rank])).toEqual([
      ['sam', 10, 1],
      ['anna', 9, 2],
    ]);
    // Anna made the only view; Sam made the only edit (edits come before tidying on a tie).
    expect(r.people[1]!.persona).toBe('views');
    expect(r.people[0]!.persona).toBe('edited');
    expect(r.people[1]!.star).toMatchObject({ id: 'a1', links: 1 });
  });

  it('keeps imports out of the rhythm and the awards', () => {
    expect(r.months[1]).toBe(0);
    // 4 created, 3 links, 1 view.
    expect(r.months[2]).toBe(8);
    expect(r.busiestMonth).toBe(2);
    expect(r.awards.find((a) => a.title === 'The Storyteller')?.actor.id).toBe('anna');
    // A tie goes to the higher-ranked person.
    expect(r.awards.find((a) => a.title === 'The Builder')?.actor.id).toBe('sam');
    expect(r.awards.every((a) => a.actor.person)).toBe(true);
  });

  it('finds the busiest day and who led it', () => {
    expect(r.busiestDay?.day).toBe(dayOf(at(3, 2)));
    expect(r.busiestDay?.count).toBe(2);
    expect(r.busiestDayLead?.actor.id).toBe('anna');
  });

  it('remembers the first thing a person added', () => {
    expect(r.first).toMatchObject({ name: 'A1', actor: anna });
  });
});

describe('longestStreak', () => {
  it('finds the longest run of consecutive days, across daylight saving', () => {
    // 29 March 2026 is the European change to summer time.
    const days = [at(3, 27), at(3, 28), at(3, 29), at(3, 30), at(4, 2), at(4, 3)].map(dayOf);
    expect(longestStreak(days)).toEqual({ days: 4, from: dayOf(at(3, 27)), to: dayOf(at(3, 30)) });
  });

  it('is undefined with no days', () => {
    expect(longestStreak([])).toBeUndefined();
  });
});

it('numbers weekdays from Monday', () => {
  expect(weekdayOf(new Date(2026, 10, 9).getTime())).toBe(0);
  expect(weekdayOf(new Date(2026, 10, 15).getTime())).toBe(6);
});

it('uses the tenant’s counts when it has them', () => {
  const d = data();
  const r = buildRewind({ ...d, size: { start: 1000, end: 1400 }, typesBefore: ['BDCore.Application', 'BDCore.Capability'] }, 2026, NOW);
  expect([r.sizeStart, r.sizeEnd]).toEqual([1000, 1400]);
  expect(r.newTypes).toEqual(['BDCore.Goal']);
});

describe('people, not scripts', () => {
  it('moves a burst of changes to a scripted account', () => {
    const d = data();
    // Anna runs a script: 30 elements in one minute.
    for (let i = 0; i < 30; i++) d.elements.push(el(`bulk${i}`, 'BDCore.Data', at(6, 3, 14, 5) + i * 1000, anna));
    const r = buildRewind(d, 2026, NOW);
    expect(r.people.find((p) => p.actor.id === 'anna')?.counts.created).toBe(2);
    expect(r.imports.map((x) => [x.actor.name, x.count])).toContainEqual(['Anna (scripted)', 30]);
    expect(r.busiestDay?.day).not.toBe(dayOf(at(6, 3)));
  });

  it('merges two accounts with one name', () => {
    const d = data();
    const anna2: Actor = { id: 'anna-sso', name: 'anna', person: true };
    d.elements.push(el('sso1', 'BDCore.Goal', at(5, 5), anna2));
    const r = buildRewind(d, 2026, NOW);
    const p = r.people.find((x) => x.actor.id === 'anna')!;
    expect(p.counts.created).toBe(3);
    expect(p.actor.ids).toEqual(['anna', 'anna-sso']);
    expect(r.people).toHaveLength(2);
  });
});
