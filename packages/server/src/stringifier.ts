import type { FlowComponent, TemplateNode } from '@fluxdom/compiler';

export class ServerNode {
  readonly attributes: Record<string, string> = {};
  readonly children: ServerNode[] = [];

  constructor(
    readonly type: 'element' | 'text',
    public value: string,
  ) {}

  toString(): string {
    if (this.type === 'text') return escapeHtml(this.value);
    const attributes = Object.entries(this.attributes)
      .map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`)
      .join('');
    if (VOID_ELEMENTS.has(this.value)) return `<${this.value}${attributes}>`;
    return `<${this.value}${attributes}>${this.children.join('')}</${this.value}>`;
  }
}

export interface ServerDOMOperations {
  createElement(tag: string): ServerNode;
  createText(text: string): ServerNode;
  insert(parent: ServerNode, child: ServerNode | ServerNode[]): void;
  setAttribute(element: ServerNode, name: string, value: unknown): void;
  setText(node: ServerNode, value: string): void;
  clearChildren(node: ServerNode): void;
  addEventListener(): void;
}

const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

export function createServerDOMContext(): { root: ServerNode; operations: ServerDOMOperations } {
  const root = new ServerNode('element', 'div');
  root.attributes.id = 'app';
  const operations: ServerDOMOperations = {
    createElement: (tag) => new ServerNode('element', tag),
    createText: (text) => new ServerNode('text', text),
    insert(parent, child) {
      parent.children.push(...(Array.isArray(child) ? child : [child]));
    },
    setAttribute(element, name, value) {
      if (value == null || value === false) delete element.attributes[name];
      else element.attributes[name] = value === true ? '' : String(value);
    },
    setText(node, value) {
      if (node.type !== 'text') throw new TypeError('setText expects a text node');
      node.value = value;
    },
    clearChildren(node) {
      node.children.length = 0;
    },
    addEventListener() {
      // Events are attached during client rendering.
    },
  };
  return { root, operations };
}

/** Render a trusted callback with explicitly injected server operations. */
export function renderToString(render: (operations: ServerDOMOperations) => ServerNode | ServerNode[] | null): string {
  const { root, operations } = createServerDOMContext();
  const result = render(operations);
  if (result) operations.insert(root, result);
  return root.toString();
}

/**
 * Render only the static subset of a parsed component. Expressions and
 * directives are rejected rather than evaluated.
 */
export function renderStaticComponent(component: FlowComponent): string {
  if (!component.template) return '<div id="app"></div>';
  const body = component.template.children.map(renderStaticNode).join('');
  return `<div id="app">${body}</div>`;
}

function renderStaticNode(node: TemplateNode): string {
  if (node.type === 'Text') return escapeHtml(node.content);
  if (node.type === 'Expression' || node.type === 'IfBlock' || node.type === 'EachBlock') {
    throw new Error(`Static SSR cannot evaluate ${node.type}; render this component on the client`);
  }
  if (Object.keys(node.bindings).length > 0 || Object.keys(node.events).length > 0) {
    throw new Error('Static SSR cannot preserve bindings or events; render this component on the client');
  }
  const attributes = Object.entries(node.attributes)
    .map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`)
    .join('');
  if (VOID_ELEMENTS.has(node.tag)) return `<${node.tag}${attributes}>`;
  return `<${node.tag}${attributes}>${node.children.map(renderStaticNode).join('')}</${node.tag}>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
