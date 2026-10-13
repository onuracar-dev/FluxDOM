import { useEffect, useRef, useState } from 'react';
import samplesData from './generated/samples.json';
import { render as renderCounter } from './generated/counter.run.js';
import { startTracing } from './trace';

const starterCommand = 'npx @fluxdom/cli create my-flow-app';

const packages = [
  {
    name: '@fluxdom/compiler',
    scope: '.flow parser, analysis, and prototype code generation',
    repoUrl: 'https://github.com/onuracar-dev/FluxDOM/tree/main/packages/compiler',
  },
  {
    name: '@fluxdom/runtime',
    scope: 'Signals, effects, batching, and direct DOM helpers',
    repoUrl: 'https://github.com/onuracar-dev/FluxDOM/tree/main/packages/runtime',
  },
  {
    name: '@fluxdom/vite-plugin',
    scope: '.flow transforms, virtual CSS, and safe static SSR helper',
    repoUrl: 'https://github.com/onuracar-dev/FluxDOM/tree/main/packages/vite-plugin',
  },
  {
    name: '@fluxdom/server',
    scope: 'Escaped static serialization and explicit server DOM operations',
    repoUrl: 'https://github.com/onuracar-dev/FluxDOM/tree/main/packages/server',
  },
  {
    name: '@fluxdom/router',
    scope: 'Route matching and browser navigation signals',
    repoUrl: 'https://github.com/onuracar-dev/FluxDOM/tree/main/packages/router',
  },
  {
    name: '@fluxdom/store',
    scope: 'Signal-backed stores with browser persistence',
    repoUrl: 'https://github.com/onuracar-dev/FluxDOM/tree/main/packages/store',
  },
  {
    name: '@fluxdom/cli',
    scope: 'Working project scaffold plus local Vite wrappers',
    repoUrl: 'https://github.com/onuracar-dev/FluxDOM/tree/main/packages/cli',
  },
];

const worksToday = [
  'AST-based script transforms: top-level let variables compile to fine-grained createSignal.',
  'Nested tags, directive validation, and file-tagged compile errors.',
  'Reactive attributes (:class, :attr), events (@event), and text expressions ({expr}).',
  'Direct DOM operations (createElement, setText, setAttribute) without Virtual DOM diffing.',
  'Scoped component CSS via unique hash attributes with virtual CSS module extraction in Vite.',
  'Static SSR container generation and working CLI project scaffolding.',
];

const notYet = [
  'General JS/TS transformations and top-level let destructuring (let { a } = obj).',
  '{#each} block keyed reconciliation (currently rerenders block on collection change).',
  'Structural DOM mount/unmount for {#if} (currently uses display wrapper).',
  'Non-destructive SSR hydration (currently destructive client rerendering).',
  'Full SSR template evaluation (dynamic templates return client mount point).',
  'Router mounting, nested routes, lifecycle hooks, source maps, and fine-grained HMR.',
];

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16M4 6h16M4 18h16" />
    </svg>
  );
}

function TruncatedCode({
  html,
  rawCode,
  limitLines = 17,
}: {
  html: string;
  rawCode: string;
  limitLines?: number;
}) {
  const lineCount = rawCode ? rawCode.split('\n').length : 0;
  const isLong = lineCount > limitLines;
  const [isExpanded, setIsExpanded] = useState(!isLong);

  return (
    <div className={`code-block-wrapper ${!isExpanded ? 'is-collapsed' : ''}`}>
      <div
        className="code-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {!isExpanded && (
        <div className="code-fade-overlay">
          <button
            type="button"
            className="show-full-btn"
            onClick={() => setIsExpanded(true)}
            aria-label={`Show full output (${lineCount} lines)`}
          >
            Show full output ({lineCount} lines)
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProductSite() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeStepId, setActiveStepId] = useState(samplesData.steps[0].id);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mobileDemoTab, setMobileDemoTab] = useState<'source' | 'output' | 'result'>('result');
  const [effectsRunCount, setEffectsRunCount] = useState(0);
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const liveMountRef = useRef<HTMLDivElement>(null);
  const outputCodeRef = useRef<HTMLDivElement>(null);

  const activeStep = samplesData.steps.find((s) => s.id === activeStepId) ?? samplesData.steps[0];

  // 1. Mount counter component and start tracking trace events
  useEffect(() => {
    if (!liveMountRef.current) return;
    liveMountRef.current.innerHTML = '';
    const node = renderCounter();
    liveMountRef.current.appendChild(node);
    startTracing();
  }, []);

  // 2. Listen to flux-trace custom events emitted by the instrumented runtime
  useEffect(() => {
    let clearTimer: number | undefined;

    const handleTrace = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      const line = customEvent.detail;
      setEffectsRunCount((prev) => prev + 1);
      setHighlightedLines((prev) => (prev.includes(line) ? prev : [...prev, line]));

      if (clearTimer) window.clearTimeout(clearTimer);
      clearTimer = window.setTimeout(() => {
        setHighlightedLines([]);
      }, 600);
    };

    window.addEventListener('flux-trace', handleTrace);
    return () => {
      window.removeEventListener('flux-trace', handleTrace);
      if (clearTimer) window.clearTimeout(clearTimer);
    };
  }, []);

  // 3. Highlight active lines in the compiled demo code panel
  useEffect(() => {
    if (!outputCodeRef.current) return;
    const lines = outputCodeRef.current.querySelectorAll('.line');
    lines.forEach((el) => {
      const lineNum = Number(el.getAttribute('data-line'));
      if (highlightedLines.includes(lineNum)) {
        el.classList.add('is-highlighted');
      } else {
        el.classList.remove('is-highlighted');
      }
    });
  }, [highlightedLines]);

  // 4. Subtle scroll-reveal intersection observer
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    document.querySelectorAll('.section-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 1500);
    } catch {
      // Fallback
    }
  };

  const handleMenuToggle = () => {
    setMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <div className="flux-site-wrapper" id="top">
      <a className="skip-link" href="#content">Skip to content</a>

      {/* 1. Nav */}
      <header
        className="site-header"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && menuOpen) {
            e.preventDefault();
            closeMenu();
            menuButtonRef.current?.focus();
          }
        }}
      >
        <div className="header-inner">
          <a className="brand-link" href="#top" aria-label="FluxDOM home">
            FluxDOM
          </a>

          <button
            ref={menuButtonRef}
            className="menu menu-button"
            type="button"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-controls="primary-navigation"
            aria-expanded={menuOpen}
            onClick={handleMenuToggle}
          >
            <MenuIcon open={menuOpen} />
          </button>

          <nav
            id="primary-navigation"
            className={`nav ${menuOpen ? 'nav--open' : ''}`}
            aria-label="Primary navigation"
          >
            <ul className="nav-links">
              <li>
                <a className="nav-link" href="#architecture" onClick={closeMenu}>Architecture</a>
              </li>
              <li>
                <a className="nav-link" href="#packages" onClick={closeMenu}>Packages</a>
              </li>
              <li>
                <a className="nav-link" href="#status" onClick={closeMenu}>Status</a>
              </li>
              <li>
                <a className="nav-link nav-link-cta" href="https://github.com/onuracar-dev/FluxDOM" target="_blank" rel="noreferrer" onClick={closeMenu}>
                  GitHub
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main id="content" className="site-main">
        {/* 2. Hero + Signature Live Compiler Demo */}
        <section className="hero-section section-reveal" aria-labelledby="hero-title">
          <div className="hero-header-block">
            <h1 id="hero-title" className="hero-title">
              <span className="title-primary">Write components.</span>
              <span className="title-secondary">Ship direct DOM.</span>
            </h1>

            <p className="hero-lead">
              FluxDOM explores a compiler-first frontend model: parse a single-file component, analyze its behavior, generate direct DOM operations, and let small signals update only the values that depend on them.
            </p>

            <div className="hero-actions">
              <a
                className="btn-primary"
                href="https://github.com/onuracar-dev/FluxDOM"
                target="_blank"
                rel="noreferrer"
              >
                View on GitHub
              </a>
              <a className="btn-secondary" href="#get-started">
                Get started ›
              </a>
            </div>

            <p className="hero-status-note">
              Pre-1.0 research prototype.
            </p>
          </div>

          {/* Signature Live Studio Window */}
          <div className="demo-studio-window">
            {/* Mobile View Switcher */}
            <div className="mobile-demo-tabs" role="tablist" aria-label="Demo view switcher">
              <button
                type="button"
                role="tab"
                id="tab-mobile-result"
                className={`mobile-tab-btn ${mobileDemoTab === 'result' ? 'is-active' : ''}`}
                aria-selected={mobileDemoTab === 'result'}
                aria-controls="panel-mobile-demo"
                onClick={() => setMobileDemoTab('result')}
              >
                Result
              </button>
              <button
                type="button"
                role="tab"
                id="tab-mobile-source"
                className={`mobile-tab-btn ${mobileDemoTab === 'source' ? 'is-active' : ''}`}
                aria-selected={mobileDemoTab === 'source'}
                aria-controls="panel-mobile-demo"
                onClick={() => setMobileDemoTab('source')}
              >
                Source
              </button>
              <button
                type="button"
                role="tab"
                id="tab-mobile-output"
                className={`mobile-tab-btn ${mobileDemoTab === 'output' ? 'is-active' : ''}`}
                aria-selected={mobileDemoTab === 'output'}
                aria-controls="panel-mobile-demo"
                onClick={() => setMobileDemoTab('output')}
              >
                Output
              </button>
            </div>

            {/* Studio Workspace Frame */}
            <div className={`demo-workspace-grid view-${mobileDemoTab}`} id="panel-mobile-demo">
              {/* Left Column: Source + Live Component */}
              <div className="demo-column demo-column-source">
                <div className="demo-panel-header">
                  <span className="demo-file-tab">Counter.flow</span>
                  <button
                    type="button"
                    className="panel-copy-btn"
                    aria-label="Copy Counter.flow source"
                    onClick={() => copyText(samplesData.counter.source, 'counter-source')}
                  >
                    <CopyIcon copied={copiedKey === 'counter-source'} />
                    <span>{copiedKey === 'counter-source' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div
                  className="code-body source-code-body"
                  dangerouslySetInnerHTML={{ __html: samplesData.counter.sourceHtml }}
                />

                {/* Interactive Live Component Dock */}
                <div className="demo-interactive-dock">
                  <div className="demo-dock-bar">
                    <span className="demo-dock-title">Live component</span>
                    <span className="demo-dock-counter" aria-live="polite">
                      effects run: {effectsRunCount}
                    </span>
                  </div>
                  <div className="demo-dock-interactive-area">
                    <div ref={liveMountRef} className="demo-counter-mount" />
                    <p className="demo-dock-guide">
                      Click the button. Targeted effect updates the text with zero virtual DOM diff.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Compiled JS Output */}
              <div className="demo-column demo-column-output">
                <div className="demo-panel-header">
                  <span className="demo-file-tab">Counter.js (compiled)</span>
                  <button
                    type="button"
                    className="panel-copy-btn"
                    aria-label="Copy compiled Counter.js"
                    onClick={() => copyText(samplesData.counter.displayJs, 'counter-output')}
                  >
                    <CopyIcon copied={copiedKey === 'counter-output'} />
                    <span>{copiedKey === 'counter-output' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div
                  ref={outputCodeRef}
                  className="code-body output-code-body"
                  dangerouslySetInnerHTML={{ __html: samplesData.counter.displayJsHtml }}
                />
              </div>
            </div>

            <div className="demo-footer-strip">
              <span className="demo-honest-note">
                Highlighting uses an instrumented copy of this exact output.
              </span>
            </div>
          </div>
        </section>

        {/* 3. How it works (Step player with vertical list) */}
        <section id="architecture" className="section-alt section-reveal" aria-labelledby="architecture-heading">
          <div className="section-container">
            <h2 id="architecture-heading" className="section-heading-left">
              <span className="title-primary">How it works.</span>
              <span className="title-secondary">Five compiler stages.</span>
            </h2>

            <div className="step-player-grid">
              {/* Vertical Step Selector */}
              <div className="step-player-rail" role="tablist" aria-label="Compiler pipeline stages">
                {samplesData.steps.map((step) => {
                  const isActive = step.id === activeStepId;
                  return (
                    <button
                      key={step.id}
                      id={`tab-${step.id}`}
                      type="button"
                      role="tab"
                      className={`step-rail-item ${isActive ? 'is-active' : ''}`}
                      aria-selected={isActive}
                      aria-controls={`panel-${step.id}`}
                      onClick={() => setActiveStepId(step.id)}
                    >
                      <span className="rail-step-num">0{step.num}</span>
                      <div className="rail-step-text">
                        <span className="rail-step-title">{step.title}</span>
                        <span className="rail-step-desc">{step.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Step Output Card */}
              <div
                id={`panel-${activeStep.id}`}
                role="tabpanel"
                aria-labelledby={`tab-${activeStep.id}`}
                className="step-display-card"
              >
                <div className="step-card-header">
                  <a
                    className="step-source-link"
                    href={activeStep.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {activeStep.file}
                  </a>
                  {activeStep.code ? (
                    <button
                      type="button"
                      className="panel-copy-btn"
                      aria-label={`Copy ${activeStep.title} stage output`}
                      onClick={() => copyText(activeStep.code!, `step-${activeStep.id}`)}
                    >
                      <CopyIcon copied={copiedKey === `step-${activeStep.id}`} />
                      <span>{copiedKey === `step-${activeStep.id}` ? 'Copied' : 'Copy'}</span>
                    </button>
                  ) : null}
                </div>

                <div className="step-card-content">
                  {activeStep.code && activeStep.html ? (
                    <TruncatedCode
                      html={activeStep.html}
                      rawCode={activeStep.code}
                      limitLines={activeStep.limitLines ?? 17}
                    />
                  ) : (
                    <div className="step-explanation-box">
                      <p className="step-explanation-text">
                        {activeStep.explanation}
                      </p>
                      <a
                        className="step-explanation-link"
                        href={activeStep.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Explore {activeStep.file} on GitHub ›
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Packages */}
        <section id="packages" className="section-plain section-reveal" aria-labelledby="packages-heading">
          <div className="section-container">
            <h2 id="packages-heading" className="section-heading-left">
              <span className="title-primary">Packages.</span>
              <span className="title-secondary">The monorepo modules.</span>
            </h2>

            <div className="packages-table-wrapper" tabIndex={0} role="region" aria-label="FluxDOM monorepo packages table">
              <table className="packages-table">
                <thead>
                  <tr>
                    <th scope="col">Package</th>
                    <th scope="col">Current scope</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((pkg) => (
                    <tr key={pkg.name}>
                      <td>
                        <a
                          className="pkg-name-link"
                          href={pkg.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {pkg.name}
                        </a>
                      </td>
                      <td>{pkg.scope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="table-subnote">
              The DevTools experiment remains private because its panel and asset packaging are not ready for independent distribution.
            </p>
          </div>
        </section>

        {/* 5. Honest status (Two-column layout) */}
        <section id="status" className="section-alt section-reveal" aria-labelledby="status-heading">
          <div className="section-container">
            <h2 id="status-heading" className="section-heading-left">
              What works today, and what doesn't.
            </h2>

            <div className="status-grid">
              <div className="status-column">
                <h3 className="status-column-title">Works today</h3>
                <ul className="status-items-list">
                  {worksToday.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="status-column">
                <h3 className="status-column-title">Not yet</h3>
                <ul className="status-items-list">
                  {notYet.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="status-security-note">
              Do not compile and execute untrusted .flow source. See{' '}
              <a
                href="https://github.com/onuracar-dev/FluxDOM/blob/main/SECURITY.md"
                target="_blank"
                rel="noreferrer"
              >
                SECURITY.md
              </a>
              .
            </p>
          </div>
        </section>

        {/* 6. Get started (Compact, Centered) */}
        <section id="get-started" className="section-plain get-started-section section-reveal" aria-labelledby="getstarted-heading">
          <div className="section-container text-center">
            <h2 id="getstarted-heading" className="section-heading-center">
              Get started.
            </h2>

            <p className="get-started-lead">
              After the packages are available on npm:
            </p>

            <div className="command-row-centered">
              <div className="command-text">
                <span className="command-prompt" aria-hidden="true">$</span>
                <code className="command-code">{starterCommand}</code>
              </div>
              <button
                type="button"
                className="panel-copy-btn"
                aria-label={starterCommand}
                onClick={() => copyText(starterCommand, 'starter')}
              >
                <CopyIcon copied={copiedKey === 'starter'} />
                <span>{copiedKey === 'starter' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="get-started-links">
              <a
                className="get-started-link"
                href="https://github.com/onuracar-dev/FluxDOM"
                target="_blank"
                rel="noreferrer"
              >
                GitHub repository ›
              </a>
              <a
                className="get-started-link"
                href="https://github.com/onuracar-dev/FluxDOM/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noreferrer"
              >
                Contributing guide ›
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-nav">
            <span>MIT License</span>
            <span aria-hidden="true">·</span>
            <a href="https://github.com/onuracar-dev/FluxDOM" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <span aria-hidden="true">·</span>
            <a href="https://onuracar.dev" target="_blank" rel="noreferrer">
              onuracar.dev
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
