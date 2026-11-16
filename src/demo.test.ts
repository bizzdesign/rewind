import { expect, it } from 'vitest';
import { demoData } from './demo';
import { buildRewind } from './rewind';

it('the demo year tells the story it was built to tell', () => {
  const now = new Date(2026, 10, 10, 12).getTime();
  const t0 = performance.now();
  const data = demoData(now);
  const r = buildRewind(data, 2026, now);
  const ms = performance.now() - t0;
  const award = (title: string) => r.awards.find((a) => a.title === title)?.actor.name;

  expect(r.busiestMonth).toBe(2);
  expect(new Date(r.busiestDay!.day).getMonth()).toBe(2);
  expect(r.newTypes).toEqual(['BDCore.Goal', 'BDCore.Initiative']);
  expect(r.imports[0]?.actor.name).toBe('ServiceNow import');
  expect(r.headliner?.name).toBe('Customer Portal');
  expect(award('The Gardener')).toBe('Priya Raman');
  expect(award('The Night Owl')).toBe('Mei Chen');
  expect(award('The Early Bird')).toBe('Tom Hendriks');
  expect(award('The Storyteller')).toBe('Léa Martin');
  expect(r.sizeEnd).toBeGreaterThan(r.sizeStart);
  expect(ms).toBeLessThan(2000);
  console.log(
    JSON.stringify({
      ms: Math.round(ms),
      elements: data.elements.length,
      relations: data.relations.length,
      totals: r.totals,
      size: [r.sizeStart, r.sizeEnd],
      people: r.people.map((p) => `${p.actor.name} ${p.points} ${p.persona}`),
      awards: r.awards.map((a) => `${a.title}: ${a.actor.name} ${a.unit}`),
      streak: r.streak?.days,
      busiestDay: [new Date(r.busiestDay!.day).toDateString(), r.busiestDay!.count],
      peak: [r.peakWeekday, r.peakHour],
    }),
  );
});
