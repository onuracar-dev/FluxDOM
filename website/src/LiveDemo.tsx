import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import samples from './generated/samples.json';
import { render as renderCounter } from './generated/counter.run.js';
import { startTracing } from './demo/runtime-shim';
import { CodeLines, type LineMark } from './highlight';

type TraceEntry = { id: number; kind: 'signal' | 'effect' | 'dom'; text: string };
type Wire = { id: number; d: string; kind: 'signal' | 'effect' | 'dom'; delay: number };

const source: string = samples.counter.source;
const compiled: string = samples.counter.displayJs;
const sourceLines = source.split('\n');
const compiledLines = compiled.split('\n');
const SRC_CLICK = sourceLines.findIndex((l) => l.includes('@click')) + 1;
const OUT_SETTER = compiledLines.findIndex((l) => l.includes('__setCount(__count()')) + 1;

let mountedButton: HTMLElement | null = null;
let tracingStarted = false;

export function LiveDemo() {
  const machineRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const srcLines = useRef(new Map<number, HTMLElement>());
  const outLines = useRef(new Map<number, HTMLElement>());

  const [broken, setBroken] = useState(false);
  const [effects, setEffects] = useState(0);
  const [writes, setWrites] = useState(0);
  const [log, setLog] = useState<TraceEntry[]>([]);
  const [outMarks, setOutMarks] = useState<Record<number, LineMark>>({});
  const [srcMarks, setSrcMarks] = useState<Record<number, LineMark>>({});
  const [wires, setWires] = useState<Wire[]>([]);
  const seq = useRef(0);

  // Mount the real compiled component once.
  useLayoutEffect(() => {
    if (broken || !liveRef.current) return;
    if (!mountedButton) mountedButton = renderCounter() as HTMLElement;
    liveRef.current.appendChild(mountedButton);
    if (!tracingStarted) {
      startTracing();
      tracingStarted = true;
    }
    return () => {
      mountedButton?.remove();
    };
  }, [broken]);

  const geometry = useCallback(() => {
    const host = machineRef.current?.getBoundingClientRect();
    return (el: Element | null | undefined, side: 'left' | 'right' | 'center') => {
      if (!el || !host) return null;
      const r = el.getBoundingClientRect();
      const x = side === 'left' ? r.left : side === 'right' ? r.right : r.left + r.width / 2;
      return { x: x - host.left, y: r.top + r.height / 2 - host.top, w: r.width, top: r.top - host.top, bottom: r.bottom - host.top };
    };
  }, []);

  const curve = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    if (Math.abs(b.x - a.x) > 60) {
      const dx = Math.max(40, (b.x - a.x) * 0.45);
      return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
    }
    const dy = (b.y - a.y) * 0.5;
    return `M${a.x},${a.y} C${a.x},${a.y + dy} ${b.x},${b.y - dy} ${b.x},${b.y}`;
  };

  const loop = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const bulge = 30;
    return `M${a.x},${a.y} C${a.x - bulge},${a.y} ${b.x - bulge},${b.y} ${b.x},${b.y}`;
  };

  // Collect the synchronous trace of one click, then animate it.
  useEffect(() => {
    let batch: { effects: number[]; doms: { line: number | null; text: string }[] } | null = null;
    let currentEffect: number | null = null;

    const flush = () => {
      if (!batch) return;
      const { effects: ran, doms } = batch;
      batch = null;
      currentEffect = null;
      play(ran, doms);
    };
    const open = () => {
      if (!batch) {
        batch = { effects: [], doms: [] };
        queueMicrotask(flush);
      }
      return batch;
    };
    const onEffect = (e: Event) => {
      const line = (e as CustomEvent).detail.line as number;
      open().effects.push(line);
      currentEffect = line;
    };
    const onDom = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d.op === 'insert') return;
      const text = d.op === 'setText' ? `text → "${d.value}"` : `<button> ${d.key} → "${d.value ?? ''}"`;
      open().doms.push({ line: currentEffect, text });
    };
    window.addEventListener('flux-trace-effect', onEffect);
    window.addEventListener('flux-trace-dom', onDom);
    return () => {
      window.removeEventListener('flux-trace-effect', onEffect);
      window.removeEventListener('flux-trace-dom', onDom);
    };
  }, []);

  const play = (ran: number[], doms: { line: number | null; text: string }[]) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pos = geometry();
    const button = liveRef.current?.querySelector('button');
    const writers = new Set(doms.map((d) => d.line));
    const next: Wire[] = [];
    const id = () => ++seq.current;

    const srcRow = pos(srcLines.current.get(SRC_CLICK), 'left');
    const srcEdge = pos(srcLines.current.get(SRC_CLICK)?.closest('.panel'), 'right');
    const a = srcRow && srcEdge ? { x: srcEdge.x, y: srcRow.y } : null;
    const s = pos(outLines.current.get(OUT_SETTER), 'left');
    if (a && s) next.push({ id: id(), d: curve(a, s), kind: 'signal', delay: 0 });
    ran.forEach((line) => {
      const e = pos(outLines.current.get(line), 'left');
      if (s && e) next.push({ id: id(), d: loop(s, e), kind: 'effect', delay: 220 });
      if (writers.has(line)) {
        const lineEl = outLines.current.get(line);
        const row = pos(lineEl, 'left');
        const edge = pos(lineEl?.closest('.panel'), 'right');
        const to = pos(button, 'left');
        if (row && edge && to) next.push({ id: id(), d: curve({ x: edge.x, y: row.y }, to), kind: 'dom', delay: 440 });
      }
    });

    setEffects((n) => n + ran.length);
    setWrites((n) => n + doms.length);
    setSrcMarks({ [SRC_CLICK]: 'signal-hit' });
    setOutMarks(Object.fromEntries([[OUT_SETTER, 'signal-hit'], ...ran.map((l) => [l, writers.has(l) ? 'effect-hit' : 'effect-soft'])]));
    setWires(reduced ? [] : next);
    // Flash the wrapper, never the component's own element: its class attribute is FluxDOM's to write.
    const mount = liveRef.current;
    if (mount && doms.length) {
      mount.classList.remove('is-flash');
      void mount.offsetWidth;
      window.setTimeout(() => mount.classList.add('is-flash'), reduced ? 0 : 440);
    }

    const entries: TraceEntry[] = [];
    const value = button?.textContent?.match(/\d+/)?.[0];
    entries.push({ id: id(), kind: 'signal', text: `count → ${value ?? '?'}` });
    ran.forEach((l) => entries.push({ id: id(), kind: 'effect', text: `effect L${l} ran${writers.has(l) ? '' : ' · no DOM change'}` }));
    doms.forEach((d) => entries.push({ id: id(), kind: 'dom', text: d.text }));
    setLog((prev) => [...entries.reverse(), ...prev].slice(0, 5));

    window.setTimeout(() => {
      setSrcMarks({});
      setOutMarks({});
    }, 1100);
    window.setTimeout(() => setWires([]), 1300);
  };

  return (
    <div className="demo">
      <div className="demo-bar">
        <div className="legend" aria-label="Color legend">
          <span className="legend-i legend-i--signal">signal</span>
          <span className="legend-arrow">→</span>
          <span className="legend-i legend-i--effect">effect</span>
          <span className="legend-arrow">→</span>
          <span className="legend-i legend-i--dom">DOM</span>
        </div>
        <div className="seg" role="tablist" aria-label="Demo source">
          <button role="tab" aria-selected={!broken} className={!broken ? 'is-on' : ''} onClick={() => setBroken(false)}>
            Counter.flow
          </button>
          <button role="tab" aria-selected={broken} className={broken ? 'is-on' : ''} onClick={() => setBroken(true)}>
            Break it
          </button>
        </div>
      </div>

      <div className="machine" ref={machineRef}>
        <article className="panel">
          <header className="panel-h">
            <span className="panel-dot" />
            {broken ? 'Broken.flow' : 'Counter.flow'}
            <span className="panel-tag">source</span>
          </header>
          {broken ? (
            <CodeLines code={samples.brokenCounter.source} marks={{ 2: 'effect-soft' }} />
          ) : (
            <CodeLines code={source} marks={srcMarks} lineRef={(n, el) => (el ? srcLines.current.set(n, el) : srcLines.current.delete(n))} />
          )}
        </article>

        <article className="panel">
          <header className="panel-h">
            <span className="panel-dot" />
            {broken ? 'compiler output' : 'Counter.js'}
            <span className="panel-tag">{broken ? 'error' : 'compiled'}</span>
          </header>
          {broken ? (
            <div className="compile-error" role="status">
              <span className="compile-error-k">FlowParseError</span>
              <p>{samples.brokenCounter.errorMessage}</p>
              <p className="compile-error-note">Real message, captured from the compiler at build time. FluxDOM refuses instead of emitting broken JavaScript.</p>
            </div>
          ) : (
            <CodeLines code={compiled} marks={outMarks} lineRef={(n, el) => (el ? outLines.current.set(n, el) : outLines.current.delete(n))} />
          )}
        </article>

        <article className="panel panel--live">
          <header className="panel-h">
            <span className="panel-dot panel-dot--live" />
            live DOM
            <span className="panel-tag">running</span>
          </header>
          <div className="live-stage">
            {broken ? (
              <p className="live-empty">Nothing to run. The compiler stopped at the source.</p>
            ) : (
              <>
                <div ref={liveRef} className="live-mount" />
                <p className="live-hint">Click the button. Watch which lines run.</p>
              </>
            )}
          </div>
          <div className="readouts">
            <Readout label="effects run" value={effects} kind="effect" />
            <Readout label="DOM writes" value={writes} kind="dom" />
          </div>
          <ol className="trace" aria-live="polite" aria-label="Trace log">
            {log.length === 0 && <li className="trace-empty">trace is empty</li>}
            {log.map((e) => (
              <li key={e.id} className={`trace-i trace-i--${e.kind}`}>
                {e.text}
              </li>
            ))}
          </ol>
        </article>

        <svg className="wires" aria-hidden="true">
          {wires.map((w) => (
            <g key={w.id} className={`wire wire--${w.kind}`} style={{ animationDelay: `${w.delay}ms` }}>
              <path d={w.d} className="wire-track" style={{ animationDelay: `${w.delay}ms` }} />
              <path d={w.d} className="wire-pulse" pathLength={1} style={{ animationDelay: `${w.delay}ms` }} />
            </g>
          ))}
        </svg>
      </div>
      <p className="demo-note">
        Left and middle are the real source and the unmodified compiler output. The button runs an instrumented copy of that output, so the counters and trace are measured, not scripted.
      </p>
    </div>
  );
}

function Readout({ label, value, kind }: { label: string; value: number; kind: 'effect' | 'dom' }) {
  return (
    <div className={`readout readout--${kind}`}>
      <span key={value} className="readout-v">
        {value}
      </span>
      <span className="readout-l">{label}</span>
    </div>
  );
}
