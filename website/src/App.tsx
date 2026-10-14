import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import samples from './generated/samples.json';
import { mountField, type FieldStats } from './field';
import { LiveDemo } from './LiveDemo';
import { CodeLines } from './highlight';

const REPO = 'https://github.com/onuracar-dev/FluxDOM';
const INSTALL = 'npx @fluxdom/cli create my-flow-app';

type Layer = 'signal' | 'effect' | 'dom';

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Copy({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="copy"
      aria-label={`${label}: ${text}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {done ? 'copied' : 'copy'}
    </button>
  );
}

function Mark() {
  return (
    <svg className="mark" viewBox="0 0 34 14" aria-hidden="true">
      <path d="M4 7 H30" />
      <circle cx="4" cy="7" r="3.2" className="mark-s" />
      <circle cx="17" cy="7" r="3.2" className="mark-e" />
      <circle cx="30" cy="7" r="3.2" className="mark-d" />
    </svg>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
      <div className="wrap nav-in">
        <a href="#top" className="brand" aria-label="FluxDOM home">
          <Mark />
          <span>FluxDOM</span>
        </a>
        <nav aria-label="Primary">
          <ul className="nav-links">
            <li><a href="#demo">Demo</a></li>
            <li><a href="#compiler">Compiler</a></li>
            <li><a href="#packages">Packages</a></li>
            <li><a href="#status">Status</a></li>
          </ul>
        </nav>
        <a className="btn btn--ink btn--sm" href={REPO}>
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </div>
    </header>
  );
}

function Hero() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<FieldStats>({ nodes: 0, effectsThisFrame: 0 });
  const [compiled, setCompiled] = useState(false);

  useLayoutEffect(() => {
    if (!fieldRef.current) return;
    let dispose = mountField(fieldRef.current, setStats);
    let w = window.innerWidth;
    const onResize = () => {
      if (Math.abs(window.innerWidth - w) < 40) return;
      w = window.innerWidth;
      dispose();
      dispose = mountField(fieldRef.current!, setStats);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      dispose();
    };
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(() => setCompiled(true), reduced ? 0 : 1250);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <section className="hero" id="top">
      <div className="hero-field" ref={fieldRef} />
      <div className="wrap hero-in">
        <p className="kicker rise" style={{ animationDelay: '60ms' }}>
          <span className="kicker-pill">v0.1 · pre-1.0</span> An experimental compiler and fine-grained DOM runtime
        </p>
        <h1 className="hero-h" aria-label="Write components. Ship direct DOM.">
          <span className="rise" style={{ animationDelay: '120ms' }}>Write components.</span>
          <span className="rise" style={{ animationDelay: '220ms' }}>
            Ship <em>direct</em>{' '}
            <span className={`swap${compiled ? ' swap--done' : ''}`}>
              <span className="swap-src">{'{target}'}</span>
              <span className="swap-out">DOM.</span>
            </span>
          </span>
        </h1>
        <p className="hero-lead rise" style={{ animationDelay: '320ms' }}>
          FluxDOM compiles a single-file <code>.flow</code> component into plain DOM calls. Small signals then update
          only the nodes that read them. No virtual DOM, no diff.
        </p>
        <div className="hero-cta rise" style={{ animationDelay: '420ms' }}>
          <a className="btn btn--ink btn--beam" href="#demo">
            Try the live demo <span aria-hidden="true">↓</span>
          </a>
          <a className="btn btn--line" href={REPO}>
            Read the source <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="install rise" style={{ animationDelay: '520ms' }}>
          <span className="install-p" aria-hidden="true">$</span>
          <code tabIndex={0} aria-label="Install command">{INSTALL}</code>
          <Copy text={INSTALL} label="Copy install command" />
        </div>
      </div>
      <div className="wrap hero-foot">
        <div className="meter" aria-live="off">
          <span className="meter-dot" />
          <span>
            <b>{stats.nodes.toLocaleString('en-US')}</b> dots, each its own signal ·{' '}
            <b className="meter-live">{stats.effectsThisFrame}</b> effects ran this frame
          </span>
        </div>
        <p className="meter-hint">Move your pointer across the paper. Only the dots near it re-run.</p>
      </div>
    </section>
  );
}

function SectionHead({ fig, title, children, id }: { fig: string; title: React.ReactNode; children?: React.ReactNode; id?: string }) {
  return (
    <div className="shead" data-reveal id={id}>
      <span className="fig">{fig}</span>
      <h2 className="shead-h">{title}</h2>
      {children && <p className="shead-p">{children}</p>}
    </div>
  );
}

function Pipeline() {
  const steps = samples.steps as unknown as Array<{
    id: string;
    num: number | string;
    title: string;
    description: string;
    file: string;
    repoUrl: string;
    code: string;
    explanation?: string;
    phaseColor: Layer;
    signals?: string[];
  }>;
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.idx));
        });
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="band band--night" id="compiler">
      <div className="wrap">
        <SectionHead fig="FIG. 2 — THE COMPILER" title={<>Five stages, <em>no magic.</em></>}>
          Every panel below is real output from the compiler, generated at build time from the README example.
        </SectionHead>
        <div className="pipe">
          <ol className="pipe-rail" aria-label="Compiler stages">
            {steps.map((s, i) => (
              <li key={s.id} className={`pipe-step pipe-step--${s.phaseColor}${i === active ? ' is-on' : ''}${i < active ? ' is-past' : ''}`}>
                <a href={`#stage-${s.id}`}>
                  <span className="pipe-n">{String(s.num).padStart(2, '0')}</span>
                  <span className="pipe-t">{s.title}</span>
                </a>
              </li>
            ))}
          </ol>
          <div className="pipe-panels">
            {steps.map((s, i) => (
              <article
                key={s.id}
                id={`stage-${s.id}`}
                data-idx={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                className={`stage stage--${s.phaseColor}`}
                data-reveal
              >
                <header className="stage-h">
                  <span className="stage-n">{String(s.num).padStart(2, '0')}</span>
                  <h3>{s.title}</h3>
                  <a className="stage-file" href={s.repoUrl}>
                    {s.file} <span aria-hidden="true">↗</span>
                  </a>
                </header>
                <p className="stage-p">{s.description}</p>
                {s.signals && s.signals.length > 0 && (
                  <div className="chips">
                    <span className="chips-l">signals found</span>
                    {s.signals.map((n, k) => (
                      <span key={n} className="chip chip--signal" style={{ transitionDelay: `${200 + k * 90}ms` }}>
                        {n}
                      </span>
                    ))}
                  </div>
                )}
                {s.code ? (
                  <div className="stage-code">
                    <CodeLines code={s.code} maxLines={16} />
                  </div>
                ) : (
                  <p className="stage-explain">{s.explanation}</p>
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Packages() {
  const pkgs = samples.packageGraph as Array<{ name: string; layer: Layer; scope: string; deps: string[] }>;
  const build = ['@fluxdom/cli', '@fluxdom/vite-plugin', '@fluxdom/compiler'];
  const run = ['@fluxdom/runtime', '@fluxdom/router', '@fluxdom/store', '@fluxdom/server'];
  const byName = new Map(pkgs.map((p) => [p.name, p]));
  const host = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<string, HTMLElement>());
  const [edges, setEdges] = useState<{ from: string; to: string; d: string }[]>([]);
  const [hover, setHover] = useState<string | null>(null);

  useLayoutEffect(() => {
    const draw = () => {
      const h = host.current?.getBoundingClientRect();
      if (!h) return;
      const out: { from: string; to: string; d: string }[] = [];
      pkgs.forEach((p) =>
        p.deps.forEach((dep) => {
          const a = cards.current.get(p.name)?.getBoundingClientRect();
          const b = cards.current.get(dep)?.getBoundingClientRect();
          if (!a || !b) return;
          const sameRow = Math.abs(a.top - b.top) < 20;
          let d: string;
          if (sameRow) {
            // Arc around the row: over the top for build-time cards, under the bottom for runtime cards.
            const up = build.includes(p.name);
            const ax = a.left + a.width / 2 - h.left;
            const bx = b.left + b.width / 2 - h.left;
            const ay = (up ? a.top : a.bottom) - h.top;
            const by = (up ? b.top : b.bottom) - h.top;
            const lift = (up ? -1 : 1) * Math.min(72, 26 + Math.abs(bx - ax) * 0.08);
            d = `M${ax},${ay} C${ax},${ay + lift} ${bx},${by + lift} ${bx},${by}`;
          } else {
            const ax = a.left + a.width / 2 - h.left;
            const ay = (b.top > a.top ? a.bottom : a.top) - h.top;
            const bx = b.left + b.width / 2 - h.left;
            const by = (b.top > a.top ? b.top : b.bottom) - h.top;
            const my = (ay + by) / 2;
            d = `M${ax},${ay} C${ax},${my} ${bx},${my} ${bx},${by}`;
          }
          out.push({ from: p.name, to: dep, d });
        }),
      );
      setEdges(out);
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (host.current) ro.observe(host.current);
    return () => ro.disconnect();
  }, []);

  const card = (name: string) => {
    const p = byName.get(name);
    if (!p) return null;
    const short = name.replace('@fluxdom/', '');
    const lit = hover && (hover === name || edges.some((e) => (e.from === hover && e.to === name) || (e.to === hover && e.from === name)));
    return (
      <div
        key={name}
        ref={(el) => {
          if (el) cards.current.set(name, el);
        }}
        className={`pkg pkg--${p.layer}${lit ? ' is-lit' : ''}${hover && !lit ? ' is-dim' : ''}`}
        onMouseEnter={() => setHover(name)}
        onMouseLeave={() => setHover(null)}
        onFocus={() => setHover(name)}
        onBlur={() => setHover(null)}
        tabIndex={0}
      >
        <span className="pkg-scope">@fluxdom/</span>
        <span className="pkg-name">{short}</span>
        <span className="pkg-desc">{p.scope}</span>
        <span className="pkg-deps">{p.deps.length ? `uses ${p.deps.map((d) => d.replace('@fluxdom/', '')).join(', ')}` : 'no internal deps'}</span>
      </div>
    );
  };

  return (
    <section className="band band--paper" id="packages">
      <div className="wrap">
        <SectionHead fig="FIG. 3 — THE PARTS" title={<>Seven small packages. <em>Take the layer you need.</em></>}>
          Arrows are read from each package.json at build time. Hover a package to see what it depends on.
        </SectionHead>
        <div className="graph" ref={host} data-reveal>
          <span className="graph-band graph-band--build">build time</span>
          <div className="graph-row graph-row--3">{build.map(card)}</div>
          <span className="graph-band graph-band--run">in the browser</span>
          <div className="graph-row graph-row--4">{run.map(card)}</div>
          <svg className="graph-edges" aria-hidden="true">
            <defs>
              <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L8,4 L0,8 z" />
              </marker>
            </defs>
            {edges.map((e) => (
              <path
                key={`${e.from}-${e.to}`}
                d={e.d}
                pathLength={1}
                markerEnd="url(#arr)"
                className={`edge${hover && (e.from === hover || e.to === hover) ? ' is-lit' : ''}`}
              />
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}

const WORKS = [
  'AST-based script transform: top-level let becomes a signal, everything else stays plain JavaScript.',
  'Nested {#if} / {#each}, reactive attributes, events and expressions, covered by fixtures.',
  'Scoped styles with a virtual CSS module that Vite bundles.',
  'Signals, effects, batching and lazy computed values without diamond glitches.',
  'Escaped static SSR that refuses to evaluate component source.',
  'Route matching, signal-backed stores, and a working project scaffold.',
];
const NOT_YET = [
  'Keyed reconciliation. {#each} rerenders its block.',
  'Structural {#if}. It toggles a display wrapper for now.',
  'Real hydration and full SSR. Hydration rerenders on the client.',
  'Destructuring let, exported signals, destructuring assignment to signals.',
  'Router mounting, nested routes, lifecycle hooks, source maps, fine-grained HMR.',
];

function Status() {
  return (
    <section className="band band--paper2" id="status">
      <div className="wrap">
        <SectionHead fig="FIG. 4 — LAB NOTES" title={<>What works today, <em>and what doesn't.</em></>}>
          Copied from the README, not from a wish list. FluxDOM is a learning-grade prototype.
        </SectionHead>
        <div className="notes" data-reveal>
          <div className="notes-col">
            <h3 className="notes-h notes-h--ok">Works today</h3>
            <ul>
              {WORKS.map((t) => (
                <li key={t} className="note note--ok">{t}</li>
              ))}
            </ul>
          </div>
          <div className="notes-col">
            <h3 className="notes-h notes-h--no">Not yet</h3>
            <ul>
              {NOT_YET.map((t) => (
                <li key={t} className="note note--no">{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Terminal() {
  const lines = samples.cliOutput as string[];
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setShown(lines.length);
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      lines.forEach((_, i) => window.setTimeout(() => setShown(i + 1), 350 + i * 520));
    });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div className="term" ref={ref}>
      <div className="term-h">
        <span>terminal</span>
        <Copy text={INSTALL} label="Copy install command" />
      </div>
      <div className="term-b">
        {lines.slice(0, shown).map((l, i) => (
          <div key={i} className={l.startsWith('$') ? 'term-cmd' : 'term-out'}>
            {l}
          </div>
        ))}
        {shown < lines.length && <span className="term-caret" aria-hidden="true" />}
      </div>
    </div>
  );
}

function Closing() {
  return (
    <section className="band band--night closing">
      <div className="wrap closing-in">
        <div data-reveal>
          <span className="fig">FIG. 5 — YOUR TURN</span>
          <h2 className="closing-h">
            Read it. <em>Run it.</em> Break it.
          </h2>
          <p className="closing-p">
            The whole compiler is a few readable files. Clone it, run the tests, change a transform and watch the output move.
          </p>
          <div className="hero-cta">
            <a className="btn btn--paper btn--beam" href={REPO}>
              Open on GitHub <span aria-hidden="true">↗</span>
            </a>
            <a className="btn btn--line-light" href={`${REPO}/tree/main/packages/compiler/src`}>
              Read the compiler <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
        <div data-reveal>
          <Terminal />
          <p className="term-note">Output captured by running the CLI from source at build time.</p>
        </div>
      </div>
    </section>
  );
}

export function App() {
  useReveal();
  return (
    <>
      <a className="skip" href="#demo">Skip to demo</a>
      <Nav />
      <main>
        <Hero />
        <section className="band band--paper2" id="demo">
          <div className="wrap wrap--wide">
            <SectionHead fig="FIG. 1 — ONE CLICK" title={<>Press the button. <em>Watch only what changed, change.</em></>}>
              A real FluxDOM component, compiled by the real compiler, running on this page.
            </SectionHead>
            <div data-reveal>
              <LiveDemo />
            </div>
            <div className="bridge" data-reveal>
              <span>
                Curious how <code className="t-signal">count++</code> became <code className="t-signal">__setCount()</code>?
              </span>
              <a className="btn btn--line btn--sm" href="#compiler">
                See the five stages <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </section>
        <Pipeline />
        <Packages />
        <Status />
        <Closing />
      </main>
      <footer className="foot">
        <div className="wrap foot-in">
          <span className="brand brand--sm">
            <Mark /> FluxDOM
          </span>
          <p className="foot-note">
            The demos on this page run on FluxDOM's own runtime. The page shell is React, because FluxDOM's router and SSR
            aren't ready yet.
          </p>
          <span className="foot-links">
            MIT · <a href={REPO}>GitHub</a> · <a href="https://onuracar.dev">onuracar.dev</a>
          </span>
        </div>
      </footer>
    </>
  );
}
