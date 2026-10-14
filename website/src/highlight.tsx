import type { ReactNode } from 'react';

// Small display-only highlighter for the handful of real snippets on the page.
// Semantic classes (signal / effect / dom) carry meaning; syntax colors stay quiet.

const SIGNAL = new Set(['count', '__count', '__setCount', 'createSignal', 'items', '__items', '__setItems', 'visible', '__visible', '__setVisible']);
const EFFECT = new Set(['createEffect']);
const DOM = new Set(['setText', 'setAttribute', 'insert', 'createElement', 'createText', 'addEventListener', 'clearChildren']);
const KEYWORDS = new Set([
  'import', 'from', 'export', 'function', 'const', 'let', 'return', 'true', 'false', 'null', 'undefined', 'new', 'if', 'else',
]);

const TOKEN = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(<\/?[a-zA-Z][\w-]*|\/?>)|(\b\d+\b)|([A-Za-z_$][\w$]*)|(\s+)|(.)/g;

export type LineMark = 'effect' | 'effect-hit' | 'effect-soft' | 'signal-hit' | null;

export function highlightLine(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(line)) !== null) {
    const [text, comment, str, tag, num, ident] = m;
    const key = i++;
    if (comment) out.push(<span key={key} className="t-comment">{text}</span>);
    else if (str) out.push(<span key={key} className="t-string">{text}</span>);
    else if (tag) out.push(<span key={key} className="t-tag">{text}</span>);
    else if (num) out.push(<span key={key} className="t-num">{text}</span>);
    else if (ident) {
      if (SIGNAL.has(ident)) out.push(<span key={key} className="t-signal">{text}</span>);
      else if (EFFECT.has(ident)) out.push(<span key={key} className="t-effect">{text}</span>);
      else if (DOM.has(ident)) out.push(<span key={key} className="t-dom">{text}</span>);
      else if (KEYWORDS.has(ident)) out.push(<span key={key} className="t-kw">{text}</span>);
      else out.push(text);
    } else out.push(text);
  }
  return out;
}

export function CodeLines({
  code,
  marks = {},
  lineRef,
  maxLines,
}: {
  code: string;
  marks?: Record<number, LineMark>;
  lineRef?: (n: number, el: HTMLElement | null) => void;
  maxLines?: number;
}) {
  const lines = code.replace(/\s+$/, '').split('\n');
  const shown = maxLines ? lines.slice(0, maxLines) : lines;
  return (
    <pre className="code" tabIndex={0} aria-label="Code snippet">
      <code>
        {shown.map((line, idx) => {
          const n = idx + 1;
          const mark = marks[n];
          return (
            <span key={n} ref={lineRef ? (el) => lineRef(n, el) : undefined} className={`ln${mark ? ` ln--${mark}` : ''}`}>
              <span className="ln-no" aria-hidden="true">{n}</span>
              <span className="ln-text">{line.length ? highlightLine(line) : ' '}</span>
            </span>
          );
        })}
        {maxLines && lines.length > maxLines && (
          <span className="ln ln--more">
            <span className="ln-no" aria-hidden="true">⋯</span>
            <span className="ln-text t-comment">{lines.length - maxLines} more lines</span>
          </span>
        )}
      </code>
    </pre>
  );
}
