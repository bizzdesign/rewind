import { dayLabel, firstName, hourLabel, monthName, n, percent, plural, shortDay, type, weekdayName } from './format';
import { CATEGORIES, type Category, PERSONAS, type PersonYear, type Rewind } from './rewind';
import { type Layer, LAYER_ORDER, layerOf } from './brand';
import { esc } from './sdk';

/**
 * The story's slides, as HTML. Numbers marked `data-count` count up when the
 * slide shows; bars grow from `--v` (0..1). Every name from the tenant goes
 * through `esc`.
 */

/** Unify navy for the cover, awards and outro; otherwise a BDCore layer's colour (src/brand.ts). */
export type Theme = 'night' | Layer;

export interface Slide {
  theme: Theme;
  /** The colour comes from the type the slide is about, so it stays put when neighbours are recoloured. */
  typed?: boolean;
  html: string;
  /** The last slide holds the share card and doesn't advance on its own. */
  final?: boolean;
}

const count = (x: number, suffix = '', prefix = '') =>
  `<span data-count="${x}" data-prefix="${esc(prefix)}" data-suffix="${esc(suffix)}">${esc(prefix)}${n(x)}${esc(suffix)}</span>`;

/** Big numbers shrink to fit the card: Inter Black widths, in em, budgeted to 80% of the card. */
const giantStyle = (text: string) => {
  const width = [...text].reduce((w, c) => w + (c === ',' || c === '.' ? 0.26 : c === '%' ? 1 : c === '+' ? 0.64 : 0.6), 0);
  return `style="font-size:${Math.min(26, 80 / Math.max(width, 0.1)).toFixed(1)}cqw"`;
};
const giant = (x: number, suffix = '', prefix = '') => `<p class="giant" ${giantStyle(`${prefix}${n(x)}${suffix}`)}>${count(x, suffix, prefix)}</p>`;

const bars = (values: number[], labels: string[], highlight: number) => {
  const max = Math.max(1, ...values);
  return `<div class="bars" style="--cols:${values.length}">${values
    .map(
      (v, i) =>
        `<div class="bar${i === highlight ? ' hot' : ''}" style="--v:${(v / max).toFixed(3)};--i:${i}" title="${esc(labels[i] ?? '')}: ${n(v)}"><span class="fill"></span><span class="lbl">${esc(labels[i] ?? '')}</span></div>`,
    )
    .join('')}</div>`;
};

const ranking = (rows: { label: string; value: number; note?: string }[]) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return `<ol class="ranking">${rows
    .map(
      (r, i) =>
        `<li style="--v:${(r.value / max).toFixed(3)};--i:${i}"><span class="pos">${i + 1}</span><span class="name">${esc(r.label)}${r.note ? `<small>${esc(r.note)}</small>` : ''}</span><span class="val">${n(r.value)}</span><span class="track"></span></li>`,
    )
    .join('')}</ol>`;
};

const heatmap = (heat: number[][]) => {
  const max = Math.max(1, ...heat.flat());
  const rows = heat
    .map(
      (row, wd) =>
        `<div class="hm-row"><span class="hm-day">${esc(weekdayName(wd, 'short'))}</span>${row
          .map((v, h) => `<span class="hm-cell" style="--v:${(v / max).toFixed(3)};--i:${wd * 24 + h}" title="${esc(weekdayName(wd))} ${hourLabel(h)}: ${n(v)}"></span>`)
          .join('')}</div>`,
    )
    .join('');
  return `<div class="heatmap">${rows}<div class="hm-row hm-axis"><span class="hm-day"></span>${Array.from({ length: 24 }, (_, h) => `<span>${h % 6 === 0 ? h : ''}</span>`).join('')}</div></div>`;
};

const monthLabels = Array.from({ length: 12 }, (_, m) => monthName(m, 'short').slice(0, 1));
const range = (r: Rewind) => (r.partial ? `1 January – ${dayLabel(r.end)}, so far` : `the whole of ${r.year}`);

const peopleTotals = (r: Rewind) => {
  const t = Object.fromEntries(CATEGORIES.map((k) => [k, 0])) as Record<Category, number>;
  for (const p of r.people) for (const k of CATEGORIES) t[k] += p.counts[k];
  return t;
};

const NOUNS: Record<Category, [string, string]> = {
  created: ['new element', 'new elements'],
  linked: ['link', 'links'],
  views: ['view', 'views'],
  edited: ['edit', 'edits'],
  tidied: ['element tidied', 'elements tidied'],
};
const statLine = (k: Category, x: number) => `<li><strong>${count(x)}</strong> ${esc(x === 1 ? NOUNS[k][0] : NOUNS[k][1])}</li>`;

export function teamSlides(r: Rewind, tenant: string): Slide[] {
  const slides: Slide[] = [];
  const t = r.totals;

  slides.push({
    theme: 'night',
    html: `
      <p class="eyebrow">${esc(tenant)}</p>
      <h1 class="mega">Rewind<br><span class="accent">${r.year}</span></h1>
      <p class="lead">A year of the knowledge graph, played back. Covers ${esc(range(r))}.</p>
      <p class="hint">Tap or press → to go on</p>`,
  });

  if (r.first)
    slides.push({
      theme: layerOf(r.first.type),
      typed: true,
      html: `
        <p class="eyebrow">It started on ${esc(dayLabel(r.first.at))}</p>
        <h2>The year's first new element was</h2>
        <p class="hero">${esc(r.first.name)}</p>
        <p class="lead">${esc(type(r.first.type))}, added by ${esc(r.first.actor.name)}. ${n(t.created - 1)} more followed.</p>`,
    });

  slides.push({
    theme: 'application',
    html: `
      <p class="eyebrow">This year we added</p>
      ${giant(t.created)}
      <h2>elements to the model</h2>
      <ul class="stats">${statLine('linked', t.linked)}${statLine('views', t.views)}${statLine('edited', t.edited)}</ul>
      ${r.addedByImports ? `<p class="small">${n(r.addedByPeople)} added by people, ${n(r.addedByImports)} through imports.</p>` : ''}`,
  });

  const grew = percent(r.sizeStart, r.sizeEnd);
  const born = r.sizeStart === 0;
  slides.push({
    theme: 'technology',
    html: `
      <p class="eyebrow">${born ? 'The model was born this year' : 'The model grew'}</p>
      ${grew === undefined ? giant(r.sizeEnd) : giant(grew, '%', grew >= 0 ? '+' : '')}
      <div class="growth" style="--a:${r.sizeEnd ? (r.sizeStart / Math.max(r.sizeStart, r.sizeEnd)).toFixed(3) : 0};--b:${r.sizeEnd >= r.sizeStart ? 1 : (r.sizeEnd / r.sizeStart).toFixed(3)}">
        <div><span class="g-bar a"></span><span class="g-label">1 January<strong>${n(r.sizeStart)}</strong></span></div>
        <div><span class="g-bar b"></span><span class="g-label">${r.partial ? 'Today' : '31 December'}<strong>${count(r.sizeEnd)}</strong></span></div>
      </div>
      <p class="small">${born && r.first ? `From an empty model to ${plural(r.sizeEnd, 'visible element')}, starting on ${esc(dayLabel(r.first.at))}.` : 'Visible elements.'} ${r.totals.tidied ? `That's after ${plural(r.totals.tidied, 'element')} were tidied away.` : ''}</p>`,
  });

  const top = r.topTypes[0];
  if (top)
    slides.push({
      theme: layerOf(top.type),
      typed: true,
      html: `
        <p class="eyebrow">What we modelled most</p>
        <h2 class="title">${esc(type(top.type))}</h2>
        ${ranking(r.topTypes.map((x) => ({ label: type(x.type), value: x.count })))}
        ${newTypesCallout(r)}`,
    });

  if (r.activeDays) {
    slides.push({
      theme: 'data',
      html: `
        <p class="eyebrow">Our busiest month</p>
        <h2 class="title">${esc(monthName(r.busiestMonth))}</h2>
        <p class="lead">${plural(r.months[r.busiestMonth] ?? 0, 'change')} by people in one month.</p>
        ${bars(r.months, monthLabels, r.busiestMonth)}`,
    });
    if (r.busiestDay)
      slides.push({
        theme: 'business',
        html: `
          <p class="eyebrow">One day stood out</p>
          <h2 class="title">${esc(dayLabel(r.busiestDay.day, true))}</h2>
          ${giant(r.busiestDay.count)}
          <h2>changes in a single day</h2>
          ${r.busiestDayLead ? `<p class="lead">${esc(r.busiestDayLead.actor.name)} led the way with ${n(r.busiestDayLead.count)}.</p>` : ''}`,
      });
    slides.push({
      theme: 'motivation',
      html: `
        <p class="eyebrow">Our rhythm</p>
        <h2>We're at our best on <span class="hl">${esc(weekdayName(r.peakWeekday))}s</span> around <span class="hl">${hourLabel(r.peakHour)}</span></h2>
        ${heatmap(r.heat)}
        <ul class="stats">
          ${r.streak ? `<li><strong>${count(r.streak.days)}</strong> days in a row with someone modelling <small>${esc(shortDay(r.streak.from))} – ${esc(shortDay(r.streak.to))}</small></li>` : ''}
          <li><strong>${count(r.activeDays)}</strong> days with changes</li>
        </ul>`,
    });
  }

  if (r.headliner)
    slides.push({
      theme: layerOf(r.headliner.type),
      typed: true,
      html: `
        <p class="eyebrow">The headliner</p>
        <h2>The element everyone connected to</h2>
        <p class="hero">${esc(r.headliner.name)}</p>
        <p class="lead">${esc(type(r.headliner.type))} · <strong>${count(r.headliner.links)}</strong> new links this year, more than any other element.</p>`,
    });

  if (r.people.length)
    slides.push({
      theme: 'strategy',
      html: `
        <p class="eyebrow">${plural(r.people.length, 'person', 'people')} shaped the model</p>
        <h2 class="title">Top contributors</h2>
        ${ranking(
          r.people.slice(0, 5).map((p) => ({
            label: p.actor.name,
            value: p.points,
            note: CATEGORIES.filter((k) => p.counts[k])
              .slice(0, 3)
              .map((k) => plural(p.counts[k], NOUNS[k][0], NOUNS[k][1]))
              .join(' · '),
          })),
        )}
        <p class="small">Points: new element 3, view 2, link, edit or tidy 1.</p>`,
    });

  if (r.awards.length)
    slides.push({
      theme: 'night',
      html: `
        <p class="eyebrow">And the awards go to</p>
        <div class="awards">${r.awards
          .map((a, i) => `<div class="award" style="--i:${i}"><p class="a-title">${esc(a.title)}</p><p class="a-name">${esc(a.actor.name)}</p><p class="a-unit">${esc(a.unit)}</p></div>`)
          .join('')}</div>`,
    });

  if (r.imports.length || t.tidied)
    slides.push({
      theme: 'implementation',
      html: `
        <p class="eyebrow">Behind the scenes</p>
        ${r.imports.length ? `<h2>Imports brought in ${plural(r.addedByImports, 'element')}</h2>${ranking(r.imports.slice(0, 3).map((x) => ({ label: x.actor.name, value: x.count })))}` : ''}
        ${t.tidied ? `<p class="callout"><strong>${count(t.tidied)}</strong> elements were tidied away, so the rest stands out.</p>` : ''}`,
    });

  slides.push(outro(`That was ${r.year}${r.partial ? ' so far' : ''}`, 'Save the card and share it with the team.'));
  return apart(slides);
}

export function personSlides(r: Rewind, p: PersonYear | undefined, name: string): Slide[] {
  if (!p)
    return [
      {
        theme: 'night',
        final: true,
        html: `
          <p class="eyebrow">Rewind ${r.year}</p>
          <h2 class="title">Nothing yet, ${esc(firstName(name))}</h2>
          <p class="lead">There are no changes from you in ${r.year}${r.partial ? ' so far' : ''}. Add an element or draw a link, and your story starts here.</p>
          <div class="cta"><button class="primary" data-act="team">Play the team's year</button></div>`,
      },
    ];

  const slides: Slide[] = [];
  const first = firstName(p.actor.name);
  const totals = peopleTotals(r);
  const persona = PERSONAS[p.persona];
  const share = totals[p.persona] ? Math.round((p.counts[p.persona] / totals[p.persona]) * 100) : 0;

  slides.push({
    theme: 'night',
    html: `
      <p class="eyebrow">Rewind ${r.year}</p>
      <h1 class="mega">${esc(first)},<br><span class="accent">this was your year</span></h1>
      <p class="lead">Your part in the knowledge graph, ${esc(range(r))}.</p>
      <p class="hint">Tap or press → to go on</p>`,
  });

  slides.push({
    theme: 'application',
    html: `
      <p class="eyebrow">This year you added</p>
      ${giant(p.counts.created)}
      <h2>${p.counts.created === 1 ? 'element' : 'elements'} to the model</h2>
      <ul class="stats">${(['linked', 'views', 'edited', 'tidied'] as Category[])
        .filter((k) => p.counts[k])
        .map((k) => statLine(k, p.counts[k]))
        .join('')}</ul>
      ${p.first ? `<p class="small">It started on ${esc(dayLabel(p.first.at))} with ${esc(p.first.name)}.</p>` : ''}`,
  });

  slides.push({
    theme: 'motivation',
    html: `
      <p class="eyebrow">Your modelling persona</p>
      <h1 class="mega"><span class="accent">${esc(persona.title)}</span></h1>
      <p class="lead">${esc(persona.line)}</p>
      ${share ? `<p class="callout"><strong>${count(share, '%')}</strong> of all the people's ${esc(NOUNS[p.persona][1])} this year were yours.</p>` : ''}`,
  });

  const top = p.topTypes[0];
  if (top)
    slides.push({
      theme: layerOf(top.type),
      typed: true,
      html: `
        <p class="eyebrow">Your top type</p>
        <h2 class="title">${esc(type(top.type))}</h2>
        ${ranking(p.topTypes.slice(0, 4).map((x) => ({ label: type(x.type), value: x.count })))}`,
    });

  if (p.busiestDay)
    slides.push({
      theme: 'business',
      html: `
        <p class="eyebrow">Your biggest day</p>
        <h2 class="title">${esc(dayLabel(p.busiestDay.day, true))}</h2>
        <p class="lead"><strong>${count(p.busiestDay.count)}</strong> changes in one day. Your busiest month was ${esc(monthName(p.months.indexOf(Math.max(...p.months))))}.</p>
        ${bars(p.months, monthLabels, p.months.indexOf(Math.max(...p.months)))}`,
    });

  if (p.star)
    slides.push({
      theme: layerOf(p.star.type),
      typed: true,
      html: `
        <p class="eyebrow">Your star creation</p>
        <h2>Of everything you added, this one drew the most links</h2>
        <p class="hero">${esc(p.star.name)}</p>
        <p class="lead">${esc(type(p.star.type))} · <strong>${count(p.star.links)}</strong> links this year.</p>`,
    });

  const owl = p.peakHour >= 20 || p.peakHour < 5;
  const bird = p.peakHour >= 5 && p.peakHour < 8;
  slides.push({
    theme: 'data',
    html: `
      <p class="eyebrow">${owl ? 'A night owl' : bird ? 'An early bird' : 'Your rhythm'}</p>
      <h2>You were at your best on <span class="hl">${esc(weekdayName(p.peakWeekday))}s</span> around <span class="hl">${hourLabel(p.peakHour)}</span></h2>
      ${heatmap(p.heat)}
      <ul class="stats">
        ${p.streak && p.streak.days > 1 ? `<li><strong>${count(p.streak.days)}</strong> days in a row <small>${esc(shortDay(p.streak.from))} – ${esc(shortDay(p.streak.to))}</small></li>` : ''}
        <li><strong>${count(p.activeDays)}</strong> days with changes</li>
      </ul>`,
  });

  const topPercent = Math.max(1, Math.ceil((p.rank / r.people.length) * 100));
  const won = r.awards.filter((a) => a.actor.id === p.actor.id);
  slides.push({
    theme: 'night',
    html: `
      <p class="eyebrow">Out of ${plural(r.people.length, 'contributor')}</p>
      <h1 class="mega">You were<br><span class="accent">#${p.rank}</span></h1>
      <p class="lead">${p.rank === 1 ? 'Nobody shaped the model more this year.' : r.people.length >= 5 && topPercent <= 50 ? `That puts you in the top ${topPercent}%.` : 'Every link counts.'} <strong>${count(p.points)}</strong> points.</p>
      ${won.length ? `<div class="awards">${won.map((a, i) => `<div class="award" style="--i:${i}"><p class="a-title">${esc(a.title)}</p><p class="a-unit">${esc(a.unit)}</p></div>`).join('')}</div>` : ''}`,
  });

  slides.push(outro(`That was your ${r.year}${r.partial ? ' so far' : ''}`, 'Save your card and share it.'));
  return apart(slides);
}

function newTypesCallout(r: Rewind): string {
  // When the whole model is new, every type is too; the growth slide already says so.
  if (!r.newTypes.length || r.sizeStart === 0) return '';
  const names = r.newTypes.map((x) => `<strong>${esc(type(x))}</strong>`);
  if (names.length > 3) return `<p class="callout">New on the map: ${names.length} types got their first element ever, including ${names.slice(0, 2).join(' and ')}.</p>`;
  return `<p class="callout">New on the map: the first ever ${names.join(' and ')}.</p>`;
}

/** No two slides in a row share a colour: a slide not tied to a type moves on to the next layer. */
function apart(slides: Slide[]): Slide[] {
  slides.forEach((slide, i) => {
    if (slide.typed || slide.theme === 'night') return;
    const clash = (t: Theme) => t === slides[i - 1]?.theme || t === slides[i + 1]?.theme;
    let k = LAYER_ORDER.indexOf(slide.theme);
    for (let tries = 0; tries < LAYER_ORDER.length && clash(slide.theme); tries++) slide.theme = LAYER_ORDER[(k = (k + 1) % LAYER_ORDER.length)]!;
  });
  return slides;
}

function outro(title: string, line: string): Slide {
  return {
    theme: 'night',
    final: true,
    html: `
      <h2 class="title small-title">${esc(title)}</h2>
      <p class="lead">${esc(line)}</p>
      <div class="card-slot"><div class="spinner"></div></div>
      <div class="cta">
        <button class="primary" data-act="save">Save image</button>
        <button data-act="copy">Copy image</button>
        <button data-act="share" hidden>Share…</button>
        <button data-act="link">Copy link</button>
      </div>
      <div class="cta subtle">
        <button class="ghost" data-act="replay">Replay</button>
        <button class="ghost" data-act="other">Next story</button>
      </div>
      <p class="toast" role="status" aria-live="polite"></p>`,
  };
}
