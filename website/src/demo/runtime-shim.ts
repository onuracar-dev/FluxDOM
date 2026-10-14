import {
  setAttribute as origSetAttribute,
  setText as origSetText,
  insert as origInsert,
} from '@fluxdom/runtime';

export * from '@fluxdom/runtime';

export function setAttribute(el: Element, key: string, value: any): void {
  const prev = el.getAttribute(key);
  origSetAttribute(el, key, value);
  const next = el.getAttribute(key);
  if (!isInitial && prev !== next && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('flux-trace-dom', {
        detail: {
          op: 'setAttribute',
          target: el.tagName.toLowerCase(),
          key,
          value: next,
          element: el,
        },
      }),
    );
  }
}

export function setText(node: Text, value: string): void {
  const prev = node.nodeValue;
  origSetText(node, value);
  const next = node.nodeValue;
  if (!isInitial && prev !== next && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('flux-trace-dom', {
        detail: {
          op: 'setText',
          target: 'text',
          value: next,
          element: node,
        },
      }),
    );
  }
}

export function insert(
  parent: HTMLElement,
  child: HTMLElement | Text | (HTMLElement | Text)[],
): void {
  origInsert(parent, child);
  if (!isInitial && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('flux-trace-dom', {
        detail: {
          op: 'insert',
          parent,
          child,
        },
      }),
    );
  }
}

let isInitial = true;

export function __trace(line: number, fn: () => void | (() => void)): () => void | (() => void) {
  return () => {
    if (isInitial) {
      return fn();
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('flux-trace-effect', {
          detail: { line },
        }),
      );
    }
    return fn();
  };
}

export function startTracing(): void {
  isInitial = false;
}

export function resetTracing(): void {
  isInitial = true;
}
