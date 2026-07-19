import type {
  EachBlockNode,
  ElementNode,
  FlowComponent,
  IfBlockNode,
  ScriptBlock,
  StyleBlock,
  TemplateBlock,
  TemplateNode,
} from './ast.js';

export class FlowParseError extends SyntaxError {
  constructor(message: string, filename: string) {
    super(`${filename}: ${message}`);
    this.name = 'FlowParseError';
  }
}

interface SourceBlock {
  attributes: string;
  content: string;
}

interface Frame {
  kind: 'element' | 'if' | 'each';
  name: string;
  children: TemplateNode[];
}

const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

export function parse(source: string, filename = 'unknown.flow'): FlowComponent {
  const scriptSource = extractBlock(source, 'script', filename);
  const templateSource = extractBlock(source, 'template', filename);
  const styleSource = extractBlock(source, 'style', filename);

  const script: ScriptBlock | null = scriptSource
    ? {
        content: scriptSource.content,
        lang: readAttribute(scriptSource.attributes, 'lang'),
      }
    : null;

  const style: StyleBlock | null = styleSource
    ? {
        content: styleSource.content,
        scoped: hasAttribute(styleSource.attributes, 'scoped'),
      }
    : null;

  const template: TemplateBlock | null = templateSource
    ? { children: parseTemplate(templateSource.content, filename) }
    : null;

  return { script, style, template };
}

function extractBlock(source: string, tag: string, filename: string): SourceBlock | null {
  const expression = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}\\s*>`, 'gi');
  const matches = Array.from(source.matchAll(expression));
  if (matches.length > 1) {
    throw new FlowParseError(`Only one <${tag}> block is allowed`, filename);
  }
  if (matches.length === 0) {
    if (new RegExp(`<${tag}\\b`, 'i').test(source)) {
      throw new FlowParseError(`Unclosed <${tag}> block`, filename);
    }
    if (new RegExp(`<\\/${tag}\\s*>`, 'i').test(source)) {
      throw new FlowParseError(`Unexpected </${tag}>`, filename);
    }
    return null;
  }
  return { attributes: matches[0][1], content: matches[0][2] };
}

function readAttribute(source: string, name: string): string | undefined {
  const match = source.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']+)["'](?:\\s|$)`, 'i'));
  return match?.[1];
}

function hasAttribute(source: string, name: string): boolean {
  return new RegExp(`(?:^|\\s)${name}(?:\\s|$)`, 'i').test(source);
}

function parseTemplate(source: string, filename: string): TemplateNode[] {
  const root: TemplateNode[] = [];
  const stack: Frame[] = [];
  let cursor = 0;

  const children = () => stack.at(-1)?.children ?? root;

  while (cursor < source.length) {
    if (source.startsWith('<!--', cursor)) {
      const end = source.indexOf('-->', cursor + 4);
      if (end < 0) throw new FlowParseError('Unclosed HTML comment', filename);
      cursor = end + 3;
      continue;
    }

    if (source[cursor] === '<') {
      const end = findTagEnd(source, cursor + 1);
      if (end < 0) throw new FlowParseError('Unclosed HTML tag', filename);
      const raw = source.slice(cursor + 1, end).trim();
      cursor = end + 1;

      if (raw.startsWith('!')) continue;
      if (raw.startsWith('/')) {
        const tag = raw.slice(1).trim().toLowerCase();
        const frame = stack.at(-1);
        if (!frame || frame.kind !== 'element' || frame.name !== tag) {
          throw new FlowParseError(`Unexpected closing tag </${tag}>`, filename);
        }
        stack.pop();
        continue;
      }

      const selfClosing = raw.endsWith('/');
      const body = selfClosing ? raw.slice(0, -1).trim() : raw;
      const nameMatch = body.match(/^([A-Za-z][\w:-]*)/);
      if (!nameMatch) throw new FlowParseError(`Invalid tag <${raw}>`, filename);
      const tag = nameMatch[1].toLowerCase();
      const { attributes, events, bindings } = parseAttributes(body.slice(nameMatch[0].length), filename);
      const node: ElementNode = { type: 'Element', tag, attributes, events, bindings, children: [] };
      children().push(node);
      if (!selfClosing && !VOID_ELEMENTS.has(tag)) {
        stack.push({ kind: 'element', name: tag, children: node.children });
      }
      continue;
    }

    if (source[cursor] === '{') {
      const end = findExpressionEnd(source, cursor);
      if (end < 0) throw new FlowParseError('Unclosed template expression', filename);
      const expression = source.slice(cursor + 1, end).trim();
      cursor = end + 1;

      if (expression.startsWith('#if ')) {
        const condition = expression.slice(4).trim();
        if (!condition) throw new FlowParseError('{#if} requires a condition', filename);
        const node: IfBlockNode = { type: 'IfBlock', condition, children: [] };
        children().push(node);
        stack.push({ kind: 'if', name: 'if', children: node.children });
      } else if (expression === '/if') {
        closeDirective(stack, 'if', filename);
      } else if (expression.startsWith('#each ')) {
        const match = expression.slice(6).trim().match(/^(.+?)\s+as\s+([A-Za-z_$][\w$]*)(?:\s*,\s*([A-Za-z_$][\w$]*))?$/);
        if (!match) throw new FlowParseError('Use {#each expression as item, index}', filename);
        const node: EachBlockNode = {
          type: 'EachBlock',
          expression: match[1].trim(),
          item: match[2],
          index: match[3],
          children: [],
        };
        children().push(node);
        stack.push({ kind: 'each', name: 'each', children: node.children });
      } else if (expression === '/each') {
        closeDirective(stack, 'each', filename);
      } else if (expression.startsWith('#') || expression.startsWith('/')) {
        throw new FlowParseError(`Unknown directive {${expression}}`, filename);
      } else if (expression) {
        children().push({ type: 'Expression', content: expression });
      }
      continue;
    }

    const nextTag = source.indexOf('<', cursor);
    const nextExpression = source.indexOf('{', cursor);
    const candidates = [nextTag, nextExpression].filter((value) => value >= 0);
    const end = candidates.length > 0 ? Math.min(...candidates) : source.length;
    const content = source.slice(cursor, end).replace(/\s+/g, ' ');
    if (content.trim()) children().push({ type: 'Text', content });
    cursor = end;
  }

  const unclosed = stack.at(-1);
  if (unclosed) {
    const label = unclosed.kind === 'element' ? `<${unclosed.name}>` : `{#${unclosed.name}}`;
    throw new FlowParseError(`Unclosed ${label}`, filename);
  }
  return root;
}

function closeDirective(stack: Frame[], kind: 'if' | 'each', filename: string): void {
  const frame = stack.at(-1);
  if (!frame || frame.kind !== kind) {
    throw new FlowParseError(`Unexpected {/${kind}}`, filename);
  }
  stack.pop();
}

function findTagEnd(source: string, start: number): number {
  let quote = '';
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote && source[index - 1] !== '\\') quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }
  return -1;
}

function findExpressionEnd(source: string, start: number): number {
  let depth = 0;
  let quote = '';
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote && source[index - 1] !== '\\') quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function parseAttributes(source: string, filename: string) {
  const attributes: Record<string, string> = {};
  const events: Record<string, string> = {};
  const bindings: Record<string, string> = {};
  const expression = /\s*([@:])?([A-Za-z_][\w:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/gy;
  let cursor = 0;

  while (cursor < source.length) {
    expression.lastIndex = cursor;
    const match = expression.exec(source);
    if (!match) {
      if (!source.slice(cursor).trim()) break;
      throw new FlowParseError(`Invalid attribute syntax near "${source.slice(cursor).trim()}"`, filename);
    }
    cursor = expression.lastIndex;
    const prefix = match[1];
    const name = match[2];
    const value = match[3] ?? match[4] ?? '';
    if (prefix && !value) throw new FlowParseError(`${prefix}${name} requires a quoted value`, filename);
    if (prefix === '@') events[name] = value;
    else if (prefix === ':') bindings[name] = value;
    else attributes[name] = value;
  }

  return { attributes, events, bindings };
}
