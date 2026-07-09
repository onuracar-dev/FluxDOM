import { FlowComponent, ScriptBlock, StyleBlock, TemplateBlock, TemplateNode, ElementNode, ExpressionNode, TextNode, IfBlockNode } from './ast.js';

export function parse(source: string, filename: string = 'unknown.flow'): FlowComponent {
  const scriptMatch = source.match(/<script(?:\s+lang=["']([^"']+)["'])?>([\s\S]*?)<\/script>/);
  const styleMatch = source.match(/<style(?:\s+(scoped))?>([\s\S]*?)<\/style>/);
  const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/);

  let script: ScriptBlock | null = null;
  if (scriptMatch) script = { lang: scriptMatch[1], content: scriptMatch[2] };

  let style: StyleBlock | null = null;
  if (styleMatch) style = { scoped: !!styleMatch[1], content: styleMatch[2] };

  let template: TemplateBlock | null = null;
  if (templateMatch) {
    template = { children: parseTemplate(templateMatch[1]) };
  }

  return { script, style, template };
}

function parseTemplate(html: string): TemplateNode[] {
  const rootChildren: TemplateNode[] = [];
  const stack: { node: ElementNode | IfBlockNode, tag: string }[] = [];
  let current = html;

  while (current.length > 0) {
    const tagOpen = current.indexOf('<');
    if (tagOpen === -1) {
      if (current.trim()) pushTextOrExpr(current, stack, rootChildren);
      break;
    }

    if (tagOpen > 0) {
      const text = current.substring(0, tagOpen);
      if (text.trim()) pushTextOrExpr(text, stack, rootChildren);
      current = current.substring(tagOpen);
      continue;
    }

    const tagClose = current.indexOf('>');
    if (tagClose === -1) break;

    const tagContent = current.substring(1, tagClose);
    current = current.substring(tagClose + 1);

    if (tagContent.startsWith('/')) {
      stack.pop();
      continue;
    }

    const parts = tagContent.split(/\s+/);
    const tag = parts[0];
    const attributes: Record<string, string> = {};
    const events: Record<string, string> = {};
    const bindings: Record<string, string> = {};

    const attrRegex = /(@|:)?([a-zA-Z0-9-]+)=["']([^"']+)["']/g;
    let match;
    while ((match = attrRegex.exec(tagContent)) !== null) {
      const type = match[1];
      const name = match[2];
      const value = match[3];
      if (type === '@') events[name] = value;
      else if (type === ':') bindings[name] = value;
      else attributes[name] = value;
    }

    const node: ElementNode = { type: 'Element', tag, attributes, events, bindings, children: [] };

    if (stack.length > 0) {
      stack[stack.length - 1].node.children.push(node);
    } else {
      rootChildren.push(node);
    }

    if (!tagContent.endsWith('/') && !['br', 'hr', 'img', 'input', 'meta'].includes(tag)) {
      stack.push({ node, tag });
    }
  }

  return rootChildren;
}

function pushTextOrExpr(text: string, stack: { node: ElementNode | IfBlockNode }[], rootChildren: TemplateNode[]) {
  const parts = text.split(/(\{.*?\})/g);
  for (const part of parts) {
    if (!part) continue;
    let node: TemplateNode;
    if (part.startsWith('{') && part.endsWith('}')) {
      const content = part.slice(1, -1).trim();
      if (content.startsWith('#if ')) {
        const block = { type: 'IfBlock', condition: content.slice(4).trim(), children: [] } as IfBlockNode;
        if (stack.length > 0) {
          stack[stack.length - 1].node.children.push(block);
        } else {
          rootChildren.push(block);
        }
        stack.push({ node: block });
        continue;
      }
      if (content === '/if') {
        stack.pop();
        continue;
      }
      node = { type: 'Expression', content } as ExpressionNode;
    } else if (part.trim()) {
      node = { type: 'Text', content: part.trim() } as TextNode;
    } else continue;

    if (stack.length > 0) {
      stack[stack.length - 1].node.children.push(node);
    } else {
      rootChildren.push(node);
    }
  }
}
