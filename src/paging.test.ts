import { describe, expect, it } from 'vitest';
import { type Paged, readAll } from './paging';

/** A backend holding `n` numbered items that refuses pages bigger than `maxPage`. */
function backend(n: number, maxPage = Infinity) {
  const asked: number[] = [];
  const result: Paged<number> = {
    getCount: async () => n,
    asPages: ({ pageSize }) => ({
      getPage: async (i) => {
        asked.push(pageSize);
        if (pageSize > maxPage) throw new Error('response too big');
        return Array.from({ length: Math.max(0, Math.min(pageSize, n - i * pageSize)) }, (_, k) => i * pageSize + k);
      },
    }),
  };
  return { result, asked };
}

const read = async (result: Paged<number>, options: Parameters<typeof readAll>[2]) => {
  const got: number[] = [];
  const more = await readAll(result, (x) => got.push(x), options);
  return { got: got.sort((a, b) => a - b), more };
};

describe('readAll', () => {
  it('reads every item once, several pages at a time', async () => {
    const { result, asked } = backend(9_500);
    const { got, more } = await read(result, { cap: 40_000 });
    expect(got).toEqual(Array.from({ length: 9_500 }, (_, i) => i));
    expect(more).toBe(false);
    expect(asked).toEqual([2_000, 2_000, 2_000, 2_000, 2_000]);
  });

  it('stops at the cap and says there was more', async () => {
    const { result } = backend(5_000);
    const { got, more } = await read(result, { cap: 3_000 });
    expect(got).toHaveLength(3_000);
    expect(got.at(-1)).toBe(2_999);
    expect(more).toBe(true);
  });

  it('halves a page the backend refuses, and still reads everything', async () => {
    const { result, asked } = backend(4_100, 600);
    const { got } = await read(result, { cap: 40_000 });
    expect(got).toEqual(Array.from({ length: 4_100 }, (_, i) => i));
    expect(asked).toContain(500);
    expect(Math.max(...asked.filter((s) => s <= 600))).toBe(500);
  });

  it('gives up below the smallest page', async () => {
    const { result } = backend(1_000, 100);
    await expect(read(result, { cap: 40_000 })).rejects.toThrow('response too big');
  });
});

it('asks for the first pages without waiting for the count', async () => {
  let countDone = false;
  let pageBeforeCount = false;
  const result: Paged<number> = {
    getCount: () => new Promise((resolve) => setTimeout(() => ((countDone = true), resolve(300)), 20)),
    asPages: () => ({
      getPage: async (i) => {
        if (!countDone) pageBeforeCount = true;
        return i === 0 ? Array.from({ length: 300 }, (_, k) => k) : [];
      },
    }),
  };
  const got: number[] = [];
  await readAll(result, (x) => got.push(x), { cap: 40_000 });
  expect(pageBeforeCount).toBe(true);
  expect(got).toHaveLength(300);
});
