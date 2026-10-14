import { createEffect, createElement, createSignal, setAttribute } from '@fluxdom/runtime';

// Hero "graph paper". Every dot is a real DOM node with its own signal and
// its own effect. The pointer only writes the signals of nearby dots, so only
// those effects run. The readout reports what actually ran.

export interface FieldStats {
  nodes: number;
  effectsThisFrame: number;
}

const SPACING = 26;
const RADIUS = 120;
const STEPS = 12;

export function mountField(container: HTMLElement, onStats: (s: FieldStats) => void): () => void {
  const rect = container.getBoundingClientRect();
  const cols = Math.max(8, Math.floor(rect.width / SPACING));
  const rows = Math.max(6, Math.floor(rect.height / SPACING));
  const offX = (rect.width - (cols - 1) * SPACING) / 2;
  const offY = (rect.height - (rows - 1) * SPACING) / 2;

  const grid = createElement('div') as HTMLElement;
  grid.className = 'field-grid';
  container.appendChild(grid);

  let effectRuns = 0;
  const setters: ((v: number) => void)[] = [];
  const heat: number[] = [];
  const disposers: (() => void)[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dot = createElement('span') as HTMLElement;
      dot.className = 'field-dot';
      dot.style.left = `${offX + c * SPACING}px`;
      dot.style.top = `${offY + r * SPACING}px`;
      grid.appendChild(dot);

      const [level, setLevel] = createSignal(0);
      let first = true;
      disposers.push(
        createEffect(() => {
          const v = level() / STEPS;
          if (!first) effectRuns++;
          first = false;
          setAttribute(dot, 'style', `left:${offX + c * SPACING}px;top:${offY + r * SPACING}px;--h:${v.toFixed(3)}`);
        }),
      );
      setters.push(setLevel);
      heat.push(0);
    }
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hot = new Set<number>();
  let pointer: { x: number; y: number } | null = null;
  let raf = 0;
  let lastReport = 0;

  const write = (i: number, value: number) => {
    const q = Math.round(value * STEPS);
    if (q === Math.round(heat[i] * STEPS)) {
      heat[i] = value;
      return;
    }
    heat[i] = value;
    setters[i](q);
  };

  const frame = (t: number) => {
    raf = 0;
    effectRuns = 0;

    if (pointer) {
      const { x, y } = pointer;
      const c0 = Math.max(0, Math.floor((x - offX - RADIUS) / SPACING));
      const c1 = Math.min(cols - 1, Math.ceil((x - offX + RADIUS) / SPACING));
      const r0 = Math.max(0, Math.floor((y - offY - RADIUS) / SPACING));
      const r1 = Math.min(rows - 1, Math.ceil((y - offY + RADIUS) / SPACING));
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const dx = offX + c * SPACING - x;
          const dy = offY + r * SPACING - y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > RADIUS) continue;
          const i = r * cols + c;
          const target = 1 - d / RADIUS;
          if (target > heat[i]) {
            write(i, target);
            hot.add(i);
          }
        }
      }
    }

    for (const i of hot) {
      const next = heat[i] * 0.9;
      if (next < 0.04) {
        write(i, 0);
        hot.delete(i);
      } else {
        write(i, next);
      }
    }

    if (t - lastReport > 120 || hot.size === 0) {
      lastReport = t;
      onStats({ nodes: cols * rows, effectsThisFrame: effectRuns });
    }
    if (hot.size > 0 || pointer) raf = requestAnimationFrame(frame);
  };

  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  const onMove = (e: PointerEvent) => {
    const b = container.getBoundingClientRect();
    pointer = { x: e.clientX - b.left, y: e.clientY - b.top };
    schedule();
  };
  const onLeave = () => {
    pointer = null;
    schedule();
  };

  onStats({ nodes: cols * rows, effectsThisFrame: 0 });

  if (!reduced) {
    container.addEventListener('pointermove', onMove, { passive: true });
    container.addEventListener('pointerleave', onLeave, { passive: true });
    container.addEventListener('pointerup', (e) => e.pointerType !== 'mouse' && onLeave(), { passive: true });
  }

  return () => {
    if (raf) cancelAnimationFrame(raf);
    container.removeEventListener('pointermove', onMove);
    container.removeEventListener('pointerleave', onLeave);
    disposers.forEach((d) => d());
    grid.remove();
  };
}
