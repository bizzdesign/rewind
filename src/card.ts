import { dayLabel, monthName, n, percent, type } from './format';
import { LAYERS, UNIFY, layerOf, logoImage } from './brand';
import { PERSONAS, type PersonYear, type Rewind } from './rewind';

/**
 * The share card: a 1080×1350 PNG (4:5 sits well in Slack, Teams and
 * LinkedIn), drawn on a canvas so it needs no screenshot library.
 */

const W = 1080;
const H = 1350;
const FONT = "'Inter Variable', Inter, system-ui, sans-serif";
// Unify's colours (src/brand.ts): white on brand blues, the colour picker's brights for accents.
const INK = '#ffffff';
const DIM = 'rgba(255,255,255,.74)';
const LIME = UNIFY.cyan;

interface Tile {
  label: string;
  value: string;
  sub?: string;
  color: string;
}

export interface CardSpec {
  eyebrow: string;
  title: string;
  subtitle: string;
  tiles: Tile[];
  footer: string;
}

export function teamCard(r: Rewind, tenant: string): CardSpec {
  const grew = percent(r.sizeStart, r.sizeEnd);
  const top = r.topTypes[0];
  const tiles: Tile[] = [
    { label: 'Elements added', value: n(r.totals.created), sub: `${n(r.totals.linked)} links · ${n(r.totals.views)} views`, color: LIME },
    { label: 'Model grew', value: grew === undefined ? n(r.sizeEnd) : `${grew >= 0 ? '+' : ''}${grew}%`, sub: `${n(r.sizeStart)} → ${n(r.sizeEnd)}`, color: UNIFY.green },
    { label: 'Top type', value: top ? type(top.type) : '–', sub: top ? `${n(top.count)} added` : undefined, color: LAYERS[layerOf(top?.type)].pastel },
    { label: 'Busiest month', value: r.activeDays ? monthName(r.busiestMonth) : '–', sub: r.busiestDay ? `peak day ${dayLabel(r.busiestDay.day)}` : undefined, color: UNIFY.brandWeak },
    { label: 'Headliner', value: r.headliner?.name ?? '–', sub: r.headliner ? `${n(r.headliner.links)} new links` : undefined, color: LAYERS[layerOf(r.headliner?.type)].pastel },
    { label: 'Longest streak', value: r.streak ? `${r.streak.days} days` : '–', sub: `${n(r.people.length)} contributors`, color: UNIFY.pink },
  ];
  return {
    eyebrow: `${tenant} · Rewind ${r.year}`,
    title: 'Our year in the knowledge graph',
    subtitle: r.people.length ? `Top contributors: ${r.people.slice(0, 3).map((p) => p.actor.name).join(', ')}` : '',
    tiles,
    footer: r.partial ? `1 January – ${dayLabel(r.end)}` : `${r.year}`,
  };
}

export function personCard(r: Rewind, p: PersonYear, tenant: string): CardSpec {
  const top = p.topTypes[0];
  const topPercent = Math.max(1, Math.ceil((p.rank / r.people.length) * 100));
  return {
    eyebrow: `${tenant} · Rewind ${r.year}`,
    title: p.actor.name,
    subtitle: PERSONAS[p.persona].title,
    tiles: [
      { label: 'Elements added', value: n(p.counts.created), color: LIME },
      { label: 'Links drawn', value: n(p.counts.linked), sub: p.counts.views ? `${n(p.counts.views)} views made` : undefined, color: UNIFY.green },
      { label: 'Rank', value: `#${p.rank}`, sub: p.rank === 1 ? `first of ${r.people.length}` : r.people.length >= 5 && topPercent <= 50 ? `top ${topPercent}% of ${r.people.length}` : `of ${r.people.length}`, color: UNIFY.yellow },
      { label: 'Top type', value: top ? type(top.type) : '–', sub: top ? `${n(top.count)} added` : undefined, color: LAYERS[layerOf(top?.type)].pastel },
      { label: 'Biggest day', value: p.busiestDay ? dayLabel(p.busiestDay.day) : '–', sub: p.busiestDay ? `${n(p.busiestDay.count)} changes` : undefined, color: UNIFY.brandWeak },
      { label: 'Star creation', value: p.star?.name ?? '–', sub: p.star ? `${n(p.star.links)} links` : undefined, color: LAYERS[layerOf(p.star?.type)].pastel },
    ],
    footer: `${n(p.points)} points · ${r.partial ? `1 January – ${dayLabel(r.end)}` : r.year}`,
  };
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, weight: number, size: number, min: number): number {
  let s = size;
  for (; s > min; s -= 2) {
    ctx.font = `${weight} ${s}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  return s;
}

function ellipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function drawCard(spec: CardSpec): Promise<HTMLCanvasElement> {
  try {
    await Promise.all([document.fonts.load(`900 80px 'Inter Variable'`), document.fonts.load(`600 30px 'Inter Variable'`), document.fonts.load(`500 26px 'Inter Variable'`)]);
  } catch {
    // Falls back to the system font.
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background: Unify navy into brand blue, with a purple and a cyan glow.
  const base = ctx.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, UNIFY.brandStrong);
  base.addColorStop(1, UNIFY.brand);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  const glow = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,40,133,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(980, 80, 520, 'rgba(133,46,221,.55)');
  glow(60, 1300, 560, 'rgba(51,221,242,.28)');

  // A small knowledge graph, top right.
  const nodes: [number, number, number][] = [
    [930, 120, 16], [1010, 200, 10], [860, 210, 11], [960, 300, 13], [1030, 330, 8], [870, 330, 8],
  ];
  const edges: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [2, 5], [1, 4]];
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 3;
  for (const [a, b] of edges) {
    ctx.beginPath();
    ctx.moveTo(nodes[a]![0], nodes[a]![1]);
    ctx.lineTo(nodes[b]![0], nodes[b]![1]);
    ctx.stroke();
  }
  nodes.forEach(([x, y, r], i) => {
    ctx.fillStyle = i === 0 ? UNIFY.cyan : i === 3 ? UNIFY.yellow : 'rgba(255,255,255,.85)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  const pad = 84;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = LIME;
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText(spec.eyebrow.toUpperCase(), pad, 130);

  ctx.fillStyle = INK;
  const titleSize = fit(ctx, spec.title, W - pad * 2 - 180, 900, 84, 44);
  ctx.font = `900 ${titleSize}px ${FONT}`;
  // Wrap the title onto up to two lines.
  const words = spec.title.split(' ');
  const lines: string[] = [];
  let line = '';
  const room = W - pad * 2 - (titleSize > 60 ? 220 : 0);
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > room && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  lines.push(line);
  lines.slice(0, 2).forEach((l, i) => ctx.fillText(ellipsis(ctx, l, W - pad * 2), pad, 232 + i * titleSize * 1.04));
  const afterTitle = 232 + (Math.min(lines.length, 2) - 1) * titleSize * 1.04;

  if (spec.subtitle) {
    ctx.fillStyle = DIM;
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText(ellipsis(ctx, spec.subtitle, W - pad * 2), pad, afterTitle + 64);
  }

  // Tiles: two columns, three rows.
  const top = 430;
  const gap = 24;
  const tw = (W - pad * 2 - gap) / 2;
  const th = 230;
  spec.tiles.slice(0, 6).forEach((tile, i) => {
    const x = pad + (i % 2) * (tw + gap);
    const y = top + Math.floor(i / 2) * (th + gap);
    roundRect(ctx, x, y, tw, th, 16);
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = tile.color;
    roundRect(ctx, x + 32, y + 34, 44, 8, 4);
    ctx.fill();
    ctx.fillStyle = DIM;
    ctx.font = `600 24px ${FONT}`;
    ctx.fillText(tile.label.toUpperCase(), x + 32, y + 82);
    ctx.fillStyle = INK;
    const size = fit(ctx, tile.value, tw - 64, 900, 64, 30);
    ctx.font = `900 ${size}px ${FONT}`;
    ctx.fillText(ellipsis(ctx, tile.value, tw - 64), x + 32, y + 158);
    if (tile.sub) {
      ctx.fillStyle = DIM;
      ctx.font = `500 24px ${FONT}`;
      ctx.fillText(ellipsis(ctx, tile.sub, tw - 64), x + 32, y + 200);
    }
  });

  ctx.fillStyle = DIM;
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText(spec.footer, pad, H - 70);
  // The Unify wordmark and "Rewind", bottom right.
  ctx.textAlign = 'right';
  ctx.fillStyle = INK;
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText('Rewind', W - pad, H - 70);
  const label = ctx.measureText('Rewind').width;
  ctx.textAlign = 'left';
  try {
    const logo = await logoImage('#ffffff');
    const h = 52;
    const w = (logo.width / logo.height) * h || h * 2;
    const x = W - pad - label - 28 - w;
    ctx.drawImage(logo, x, H - 70 - h + 10, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.fillRect(W - pad - label - 15, H - 98, 2, 34);
  } catch {
    // The card still works without the wordmark.
  }
  return canvas;
}

export const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the card'))), 'image/png'));
