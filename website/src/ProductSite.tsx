import { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  Box,
  Braces,
  Check,
  ChevronRight,
  Code2,
  Copy,
  Github,
  Layers3,
  Menu,
  PackageOpen,
  Play,
  Plus,
  Sparkles,
  Terminal,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

const starterCommand = 'npx @fluxdom/cli create my-flow-app';

const source = `<script lang="ts">
  let items = ['compiler', 'signals'];
  let visible = true;
</script>

<template>
  {#if visible}
    <ul class:ready={items.length > 1}>
      {#each items as item, index}
        <li>{index}: {item}</li>
      {/each}
    </ul>
  {/if}
</template>

<style scoped>
  li { color: var(--flux-blue); }
</style>`;

const packages = [
  ['compiler', 'Parse, analyze, and generate'],
  ['runtime', 'Signals and direct DOM helpers'],
  ['vite-plugin', '.flow transforms + virtual CSS'],
  ['router', 'Reactive route matching'],
  ['store', 'Signal-backed persistence'],
  ['server', 'Safe static serialization'],
  ['cli', 'A working project scaffold'],
];

function FluxMark() {
  return (
    <span className="flux-mark" aria-hidden="true">
      <span>F</span><i /><b />
    </span>
  );
}

function ProductSite() {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [items, setItems] = useState(['compiler', 'signals']);
  const [nextItem, setNextItem] = useState('direct DOM');
  const [visible, setVisible] = useState(true);

  const emittedOperations = useMemo(() => visible ? 3 + items.length * 2 : 1, [items.length, visible]);

  const addItem = () => {
    const value = nextItem.trim();
    if (!value) return;
    setItems((current) => [...current, value]);
    setNextItem('');
  };

  const copyStarter = async () => {
    await navigator.clipboard?.writeText(starterCommand);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flux-site">
      <a className="skip" href="#content">Skip to content</a>
      <div className="alpha-ribbon">experimental · pre-1.0</div>
      <header onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          event.preventDefault();
          setMenuOpen(false);
          window.requestAnimationFrame(() => menuButtonRef.current?.focus());
        }
      }}>
        <a className="logo" href="#top" aria-label="FluxDOM home"><FluxMark /><span>FluxDOM</span></a>
        <button ref={menuButtonRef} className="menu" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-controls="primary-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X /> : <Menu />}</button>
        <nav id="primary-navigation" className={menuOpen ? 'nav nav--open' : 'nav'} aria-label="Primary navigation">
          <a href="#idea" onClick={() => setMenuOpen(false)}>The idea</a>
          <a href="#playground" onClick={() => setMenuOpen(false)}>Playground</a>
          <a href="#packages" onClick={() => setMenuOpen(false)}>Packages</a>
          <a href="#roadmap" onClick={() => setMenuOpen(false)}>Roadmap</a>
          <a className="nav-github" href="https://github.com/onuracar-dev/FluxDOM" target="_blank" rel="noreferrer"><Github /> Source</a>
        </nav>
      </header>

      <main id="content">
        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="overline"><Asterisk /> compiler-first · fine-grained · inspectable</p>
            <h1>Author components.<br /><span>Ship direct DOM.</span></h1>
            <p className="lead">FluxDOM turns readable <code>.flow</code> components into focused DOM operations and lets small signals update only what depends on them.</p>
            <div className="hero-actions">
              <a className="cta cta--dark" href="#playground">Open the playground <Play /></a>
              <a className="cta cta--line" href="https://github.com/onuracar-dev/FluxDOM" target="_blank" rel="noreferrer">Read the source <ArrowUpRight /></a>
            </div>
            <button className="command" type="button" onClick={copyStarter}>
              <Terminal /><code>{starterCommand}</code><span>{copied ? <Check /> : <Copy />}</span>
              <span className="screen-reader" aria-live="polite">{copied ? 'Starter command copied' : ''}</span>
            </button>
          </div>

          <div className="compiler-visual" role="img" aria-label="FluxDOM compiler pipeline from a component source file to generated direct DOM operations">
            <div className="file-card">
              <div className="file-card__bar"><span>Counter.flow</span><i /><i /><i /></div>
              <div className="mini-code">
                <span><b>&lt;script&gt;</b></span>
                <span>&nbsp;&nbsp;let count = <em>0</em>;</span>
                <span><b>&lt;/script&gt;</b></span>
                <span>&nbsp;</span>
                <span><b>&lt;button</b> @click={'{count++}'}<b>&gt;</b></span>
                <span>&nbsp;&nbsp;{'{count}'}</span>
                <span><b>&lt;/button&gt;</b></span>
              </div>
            </div>
            <div className="compile-arrow"><Zap /><span>analyze</span><ChevronRight /></div>
            <div className="output-card">
              <span className="output-card__tag">generated</span>
              <div><i>01</i><code>element('button')</code></div>
              <div><i>02</i><code>on(node, 'click')</code></div>
              <div><i>03</i><code>effect(updateText)</code></div>
              <p><Sparkles /> no virtual tree in the update path</p>
            </div>
            <div className="visual-stamp">source → structure → operations</div>
          </div>
        </section>

        <section className="manifesto" id="idea">
          <span className="section-index">01</span>
          <div>
            <p className="overline">THE EXPERIMENT</p>
            <h2>A framework should be<br /><em>explainable end to end.</em></h2>
          </div>
          <p className="manifesto-copy">FluxDOM is a learning-driven framework project: a structural parser, transparent transforms, a tiny reactive runtime, and direct DOM helpers in one repository. Today it is for exploration—not production promises.</p>
        </section>

        <section className="mechanics">
          <article><span>01</span><Braces /><h3>Parse structure</h3><p>Nested tags, expressions, events, <code>if</code>/<code>each</code> blocks, and scoped styles become an analyzable component model.</p></article>
          <article><span>02</span><Layers3 /><h3>Analyze dependencies</h3><p>Reactive reads become explicit so the generated program knows which operation should rerun.</p></article>
          <article><span>03</span><Zap /><h3>Touch the DOM</h3><p>Signals and effects update targeted nodes through a deliberately small runtime surface.</p></article>
        </section>

        <section className="playground" id="playground">
          <div className="section-title">
            <span className="section-index">02</span>
            <div><p className="overline">INTERACTIVE MODEL</p><h2>Edit state.<br />See the operation budget.</h2></div>
            <p>This browser model mirrors FluxDOM’s reactive idea: a collection change updates its dependent block while unrelated content stays put.</p>
          </div>
          <div className="workbench">
            <div className="workbench-source">
              <div className="workbench-bar"><Code2 /><strong>List.flow</strong><span>source</span></div>
              <pre><code>{source}</code></pre>
            </div>
            <div className="workbench-output">
              <div className="workbench-bar"><Play /><strong>Preview</strong><span>{emittedOperations} operations modeled</span></div>
              <div className="preview-controls">
                <input aria-label="New list item" value={nextItem} placeholder="new item" onChange={(event) => setNextItem(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addItem(); }} />
                <button type="button" onClick={addItem}><Plus /> Add</button>
                <button className="visibility" type="button" aria-pressed={visible} onClick={() => setVisible((value) => !value)}>{visible ? 'Hide block' : 'Show block'}</button>
              </div>
              <div className={visible ? 'preview-list' : 'preview-list preview-list--hidden'}>
                {visible ? items.map((item, index) => (
                  <div key={`${item}-${index}`}><span>{String(index).padStart(2, '0')}</span><strong>{item}</strong><button type="button" aria-label={`Remove ${item}`} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 /></button></div>
                )) : <p>Conditional block is not visible.</p>}
              </div>
              <div className="operation-meter"><span style={{ width: `${Math.min(100, emittedOperations * 7)}%` }} /><p><Zap /> modeled targeted work: <strong>{emittedOperations}</strong></p></div>
            </div>
          </div>
        </section>

        <section className="package-section" id="packages">
          <div className="section-title section-title--packages">
            <span className="section-index">03</span>
            <div><p className="overline">ONE LAB, SMALL PACKAGES</p><h2>Use the layer<br />you came to inspect.</h2></div>
            <p>Every package is independently versioned within the monorepo. The DevTools experiment stays private until its packaging is real.</p>
          </div>
          <div className="package-grid">
            {packages.map(([name, purpose], index) => <article key={name}><span>0{index + 1}</span><PackageOpen /><h3>@fluxdom/{name}</h3><p>{purpose}</p></article>)}
          </div>
        </section>

        <section className="roadmap" id="roadmap">
          <div className="roadmap-heading"><span className="section-index">04</span><p className="overline">THE HONEST ROADMAP</p><h2>Useful now for learning.<br />Not ready for your checkout.</h2></div>
          <div className="roadmap-columns">
            <div><h3><Check /> Working today</h3><ul><li>Nested <code>if</code> and <code>each</code> parsing</li><li>Signals, effects, batching, and DOM helpers</li><li>Reactive attributes, events, and scoped CSS</li><li>Safe static serialization and CLI scaffold</li></ul></div>
            <div><h3><Box /> Before production</h3><ul><li>General TypeScript AST transforms</li><li>Keyed reconciliation and lifecycle hooks</li><li>Non-destructive hydration and dynamic SSR</li><li>Source maps, nested routing, and robust HMR</li></ul></div>
          </div>
          <a href="https://github.com/onuracar-dev/FluxDOM#supported-boundary-and-known-limitations" target="_blank" rel="noreferrer">Read every known limitation <ArrowUpRight /></a>
        </section>

        <section className="closing">
          <div className="closing-mark"><FluxMark /></div>
          <div><p className="overline">BUILD WITH THE SOURCE OPEN</p><h2>Follow the compiler<br />from character to node.</h2></div>
          <a className="cta cta--orange" href="https://github.com/onuracar-dev/FluxDOM" target="_blank" rel="noreferrer"><Github /> Explore FluxDOM <ArrowRight /></a>
        </section>
      </main>

      <footer>
        <a className="logo" href="#top"><FluxMark /><span>FluxDOM</span></a>
        <p>Experimental compiler-first UI framework by <a href="https://github.com/onuracar-dev">Onur Acar</a>.</p>
        <div><a href="https://github.com/onuracar-dev/FluxDOM">GitHub</a><a href="https://github.com/onuracar-dev/FluxDOM/blob/main/SECURITY.md">Security</a><a href="https://github.com/onuracar-dev/FluxDOM/blob/main/LICENSE">MIT</a></div>
      </footer>
    </div>
  );
}

export default ProductSite;
