import { toBlob } from './card';
import { LOCALE } from './format';
import { type Slide } from './slides';
import { soon } from './soon';

/**
 * Plays slides as a full-screen story: progress bars on top, tap the right of
 * the card (or →) for next and the left (or ←) for back, hold to pause, Esc
 * to close. Each slide advances itself when its progress bar fills; the bar
 * is a CSS animation, so pausing is just pausing it.
 */

export interface StoryOptions {
  slides: Slide[];
  card: () => Promise<HTMLCanvasElement>;
  fileName: string;
  /** A link that opens this story again. */
  link: string;
  otherLabel?: string;
  onClose(): void;
  onAct(act: 'team' | 'other'): void;
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function playStory(host: HTMLElement, o: StoryOptions): { close(): void } {
  let index = 0;
  let paused = false;
  let holding = false;
  let holdTimer = 0;
  let pressedAt = 0;
  const timers: number[] = [];

  host.innerHTML = `
    <div class="player" tabindex="-1" role="dialog" aria-modal="true" aria-label="Rewind story">
      <button class="nav prev" data-nav="-1" aria-label="Previous">‹</button>
      <div class="frame">
        <div class="decor" aria-hidden="true"><span class="blob b1"></span><span class="blob b2"></span><span class="ring"></span><svg class="graph" viewBox="0 0 100 178" preserveAspectRatio="xMidYMid slice"><g class="edges"><line x1="78" y1="14" x2="94" y2="34"/><line x1="78" y1="14" x2="60" y2="30"/><line x1="60" y1="30" x2="94" y2="34"/><line x1="94" y1="34" x2="86" y2="56"/><line x1="60" y1="30" x2="70" y2="50"/><line x1="70" y1="50" x2="86" y2="56"/><line x1="8" y1="140" x2="24" y2="160"/><line x1="24" y1="160" x2="40" y2="150"/><line x1="8" y1="140" x2="26" y2="128"/><line x1="26" y1="128" x2="40" y2="150"/><line x1="40" y1="150" x2="50" y2="170"/></g><g class="nodes"><circle cx="78" cy="14" r="2.6"/><circle cx="94" cy="34" r="1.8"/><circle cx="60" cy="30" r="1.8"/><circle cx="86" cy="56" r="1.4"/><circle cx="70" cy="50" r="2.2"/><circle cx="8" cy="140" r="1.8"/><circle cx="24" cy="160" r="2.6"/><circle cx="40" cy="150" r="1.6"/><circle cx="26" cy="128" r="1.4"/><circle cx="50" cy="170" r="1.8"/></g></svg></div>
        <div class="progress">${o.slides.map(() => '<span class="seg"><i></i></span>').join('')}</div>
        <div class="top-actions">
          <button class="icon" data-act="pause" aria-label="Pause">❚❚</button>
          <button class="icon" data-act="close" aria-label="Close">✕</button>
        </div>
        <div class="slide-host"></div>
      </div>
      <button class="nav next" data-nav="1" aria-label="Next">›</button>
    </div>`;

  const player = host.querySelector<HTMLElement>('.player')!;
  const frame = host.querySelector<HTMLElement>('.frame')!;
  const slideHost = host.querySelector<HTMLElement>('.slide-host')!;
  const segs = [...host.querySelectorAll<HTMLElement>('.seg')];
  const pauseButton = host.querySelector<HTMLButtonElement>('[data-act=pause]')!;

  const setPaused = (value: boolean) => {
    paused = value;
    frame.classList.toggle('paused', paused || holding);
    pauseButton.textContent = paused ? '▶' : '❚❚';
    pauseButton.setAttribute('aria-label', paused ? 'Play' : 'Pause');
  };

  const countUp = (root: HTMLElement) => {
    root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
      const target = Number(el.dataset.count);
      const prefix = el.dataset.prefix ?? '';
      const suffix = el.dataset.suffix ?? '';
      const show = (x: number) => (el.textContent = `${prefix}${Math.round(x).toLocaleString(LOCALE)}${suffix}`);
      if (reduced() || !Number.isFinite(target) || target < 10) return show(target);
      const started = performance.now();
      const span = Math.min(1600, 500 + Math.log10(target) * 300);
      show(0);
      // A timer rather than animation frames: background tabs and embedded browsers may get none.
      const id = window.setInterval(() => {
        const k = Math.min(1, (performance.now() - started) / span);
        show(target * (1 - (1 - k) ** 3));
        if (k >= 1) window.clearInterval(id);
      }, 33);
      timers.push(id);
    });
  };

  const say = (text: string) => {
    const toast = slideHost.querySelector<HTMLElement>('.toast');
    if (toast) toast.textContent = text;
  };

  let cardCanvas: Promise<HTMLCanvasElement> | undefined;
  const drawCard = () => (cardCanvas ??= o.card());

  async function fillCard(slide: HTMLElement) {
    const slot = slide.querySelector<HTMLElement>('.card-slot');
    if (!slot) return;
    try {
      const canvas = await drawCard();
      const img = new Image();
      img.alt = 'Your Rewind card';
      img.src = canvas.toDataURL('image/png');
      slot.replaceChildren(img);
      const share = slide.querySelector<HTMLButtonElement>('[data-act=share]');
      if (share && 'canShare' in navigator) {
        const file = new File([await toBlob(canvas)], o.fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) share.hidden = false;
      }
    } catch (error) {
      slot.textContent = error instanceof Error ? error.message : String(error);
    }
  }

  function show(i: number) {
    index = Math.max(0, Math.min(o.slides.length - 1, i));
    const slide = o.slides[index]!;
    timers.splice(0).forEach((id) => window.clearInterval(id));
    frame.dataset.theme = slide.theme;
    const el = document.createElement('section');
    el.className = 'slide';
    el.setAttribute('aria-roledescription', 'slide');
    el.setAttribute('aria-label', `${index + 1} of ${o.slides.length}`);
    el.innerHTML = slide.html;
    if (slide.final && o.otherLabel) {
      const other = el.querySelector<HTMLButtonElement>('[data-act=other]');
      if (other) other.textContent = o.otherLabel;
    } else el.querySelector('[data-act=other]')?.remove();
    slideHost.replaceChildren(el);
    // The text length sets the pace: short slides 5.5 s, busy ones up to 10 s.
    const duration = Math.max(5500, Math.min(10_000, 4000 + (el.textContent?.length ?? 0) * 18));
    segs.forEach((seg, j) => {
      seg.classList.toggle('done', j < index || (j === index && !!slide.final));
      seg.classList.toggle('current', j === index && !slide.final);
      const bar = seg.querySelector('i')!;
      bar.style.animation = 'none';
      if (j === index && !slide.final) {
        void bar.offsetWidth;
        bar.style.animation = '';
        bar.style.animationDuration = `${duration}ms`;
      }
    });
    soon(() => el.classList.add('on'));
    countUp(el);
    if (slide.final) void fillCard(el);
    pauseButton.hidden = !!slide.final;
    host.querySelector<HTMLButtonElement>('.nav.prev')!.disabled = index === 0;
    host.querySelector<HTMLButtonElement>('.nav.next')!.disabled = index === o.slides.length - 1;
  }

  const go = (delta: number) => show(index + delta);

  segs.forEach((seg, j) =>
    seg.querySelector('i')!.addEventListener('animationend', () => {
      if (j === index && !paused) go(1);
    }),
  );

  async function act(name: string) {
    if (name === 'close') return close();
    if (name === 'pause') return setPaused(!paused);
    if (name === 'replay') return show(0);
    if (name === 'team' || name === 'other') return o.onAct(name);
    try {
      const canvas = await drawCard();
      if (name === 'save') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(await toBlob(canvas));
        a.download = o.fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
        say('Saved. Drop it into Slack or Teams.');
      } else if (name === 'copy') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': toBlob(canvas) })]);
        say('Copied. Paste it straight into a chat.');
      } else if (name === 'share') {
        await navigator.share({ files: [new File([await toBlob(canvas)], o.fileName, { type: 'image/png' })], title: 'Rewind' });
      } else if (name === 'link') {
        await navigator.clipboard.writeText(o.link);
        say('Link copied. Colleagues with access to this tenant can play it too.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      say(name === 'copy' ? 'This browser won’t copy images. Use Save image instead.' : error instanceof Error ? error.message : String(error));
    }
  }

  player.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest<HTMLElement>('[data-act],[data-nav]');
    if (button?.dataset.act) return void act(button.dataset.act);
    if (button?.dataset.nav) return go(Number(button.dataset.nav));
  });

  // Tap left or right on the card; hold anywhere on it to pause.
  const interactive = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest('button, a, input, select, .card-slot img');
  slideHost.addEventListener('pointerdown', (e) => {
    if (interactive(e.target) || e.button !== 0) return;
    pressedAt = performance.now();
    holdTimer = window.setTimeout(() => {
      holding = true;
      setPaused(paused);
    }, 220);
  });
  slideHost.addEventListener('pointerup', (e) => {
    if (interactive(e.target) || !pressedAt) return;
    window.clearTimeout(holdTimer);
    const wasHolding = holding;
    holding = false;
    setPaused(paused);
    pressedAt = 0;
    if (wasHolding) return;
    const box = frame.getBoundingClientRect();
    go(e.clientX - box.left < box.width * 0.3 ? -1 : 1);
  });
  slideHost.addEventListener('pointerleave', () => {
    window.clearTimeout(holdTimer);
    pressedAt = 0;
    if (holding) {
      holding = false;
      setPaused(paused);
    }
  });

  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea')) return;
    if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) setPaused(!paused);
    else if (e.key === 'Escape') close();
    else return;
    e.preventDefault();
  };
  const onVisibility = () => frame.classList.toggle('paused', paused || holding || document.hidden);
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVisibility);

  function close() {
    timers.splice(0).forEach((id) => window.clearInterval(id));
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    host.innerHTML = '';
    o.onClose();
  }

  show(0);
  player.focus();
  return { close };
}
