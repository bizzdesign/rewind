import { typeLabel } from './sdk';

/** The copy is English, so dates and numbers are too (a Dutch browser would otherwise say "maart" mid-sentence). */
export const LOCALE = 'en-GB';

export const n = (x: number) => x.toLocaleString(LOCALE);
export const plural = (x: number, one: string, many = `${one}s`) => `${n(x)} ${x === 1 ? one : many}`;

export const monthName = (m: number, style: 'long' | 'short' = 'long') => new Date(2026, m, 1).toLocaleString(LOCALE, { month: style });
/** Monday = 0. */
export const weekdayName = (wd: number, style: 'long' | 'short' = 'long') => new Date(2026, 10, 9 + wd).toLocaleString(LOCALE, { weekday: style });
export const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;
export const dayLabel = (t: number, weekday = false) =>
  new Date(t).toLocaleDateString(LOCALE, { ...(weekday ? { weekday: 'long' } : {}), day: 'numeric', month: 'long' });
export const shortDay = (t: number) => new Date(t).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });

export const type = (t: string) => typeLabel(t);
export const firstName = (name: string) => name.split(/\s+/)[0] ?? name;

export const percent = (from: number, to: number) => (from > 0 ? Math.round(((to - from) / from) * 100) : undefined);
