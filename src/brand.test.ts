import { describe, expect, it } from 'vitest';
import { LAYERS, LAYER_ORDER, layerOf } from './brand';

/** WCAG relative luminance and contrast ratio. */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

describe('layer colours', () => {
  it.each(Object.entries(LAYERS))('%s: navy text and its highlight read on the vivid colour', (_, c) => {
    expect(contrast('#00234c', c.vivid)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.deep, c.vivid)).toBeGreaterThanOrEqual(3);
  });

  it('maps each BDCore type to its layer, as Unify colours its icon', () => {
    expect(layerOf('BDCore.Capability')).toBe('strategy');
    expect(layerOf('BDCore.Process')).toBe('business');
    expect(layerOf('BDCore.SoftwareTechnology')).toBe('technology');
    expect(layerOf('BDCore.ValueStream')).toBe('application');
    expect(new Set(LAYER_ORDER)).toEqual(new Set(Object.keys(LAYERS)));
  });
});
