import type { ComponentAnalysis } from '../analyzer/index.js';
import type { EachBlockNode, ElementNode, ExpressionNode, IfBlockNode, TemplateNode, TextNode } from '../parser/ast.js';

export function transformTemplate(analysis: ComponentAnalysis, scopeHash?: string): string {
  const { component } = analysis;
  if (!component.template) return 'export function render() { return null; }';

  const imports = new Set<string>();
  const domOperations: string[] = [];
  let variableCounter = 0;

  const variable = (prefix: string) => `__${prefix}${variableCounter++}`;
  const addInsert = (operations: string[], parent: string | undefined, child: string) => {
    if (!parent) return;
    imports.add('insert');
    operations.push(`insert(${parent}, ${child});`);
  };

  function processNode(
    node: TemplateNode,
    parent: string | undefined,
    operations: string[],
    locals = new Set<string>(),
  ): string {
    if (node.type === 'Element') {
      const element = node as ElementNode;
      const elementVariable = variable('el');
      imports.add('createElement');
      operations.push(`const ${elementVariable} = createElement(${JSON.stringify(element.tag)});`);

      for (const [key, value] of Object.entries(element.attributes)) {
        imports.add('setAttribute');
        operations.push(`setAttribute(${elementVariable}, ${JSON.stringify(key)}, ${JSON.stringify(value)});`);
      }
      if (scopeHash) {
        imports.add('setAttribute');
        operations.push(`setAttribute(${elementVariable}, 'data-fluxdom', ${JSON.stringify(scopeHash)});`);
      }
      for (const [event, handler] of Object.entries(element.events)) {
        imports.add('addEventListener');
        operations.push(`addEventListener(${elementVariable}, ${JSON.stringify(event)}, ${transformExpression(handler, analysis, locals)});`);
      }
      for (const [key, expression] of Object.entries(element.bindings)) {
        imports.add('createEffect');
        imports.add('setAttribute');
        operations.push(`createEffect(() => { setAttribute(${elementVariable}, ${JSON.stringify(key)}, ${transformExpression(expression, analysis, locals)}); });`);
      }
      for (const child of element.children) processNode(child, elementVariable, operations, locals);
      addInsert(operations, parent, elementVariable);
      return elementVariable;
    }

    if (node.type === 'Text') {
      const text = node as TextNode;
      const textVariable = variable('text');
      imports.add('createText');
      operations.push(`const ${textVariable} = createText(${JSON.stringify(text.content)});`);
      addInsert(operations, parent, textVariable);
      return textVariable;
    }

    if (node.type === 'Expression') {
      const expression = node as ExpressionNode;
      const expressionVariable = variable('expr');
      imports.add('createText');
      imports.add('createEffect');
      imports.add('setText');
      operations.push(`const ${expressionVariable} = createText('');`);
      operations.push(`createEffect(() => { setText(${expressionVariable}, String(${transformExpression(expression.content, analysis, locals)})); });`);
      addInsert(operations, parent, expressionVariable);
      return expressionVariable;
    }

    if (node.type === 'IfBlock') {
      const block = node as IfBlockNode;
      const blockVariable = variable('if');
      imports.add('createElement');
      imports.add('createEffect');
      imports.add('setAttribute');
      operations.push(`const ${blockVariable} = createElement('span');`);
      operations.push(`setAttribute(${blockVariable}, 'data-flow-if', '');`);
      if (scopeHash) operations.push(`setAttribute(${blockVariable}, 'data-fluxdom', ${JSON.stringify(scopeHash)});`);
      for (const child of block.children) processNode(child, blockVariable, operations, locals);
      const condition = transformExpression(block.condition, analysis, locals);
      operations.push(`createEffect(() => { setAttribute(${blockVariable}, 'style', ${condition} ? 'display: contents;' : 'display: none;'); });`);
      addInsert(operations, parent, blockVariable);
      return blockVariable;
    }

    const block = node as EachBlockNode;
    const blockVariable = variable('each');
    const valuesVariable = variable('values');
    const childOperations: string[] = [];
    const childLocals = new Set(locals);
    childLocals.add(block.item);
    if (block.index) childLocals.add(block.index);

    imports.add('createElement');
    imports.add('createEffect');
    imports.add('clearChildren');
    imports.add('setAttribute');
    operations.push(`const ${blockVariable} = createElement('span');`);
    operations.push(`setAttribute(${blockVariable}, 'data-flow-each', '');`);
    operations.push(`setAttribute(${blockVariable}, 'style', 'display: contents;');`);
    if (scopeHash) operations.push(`setAttribute(${blockVariable}, 'data-fluxdom', ${JSON.stringify(scopeHash)});`);
    for (const child of block.children) processNode(child, blockVariable, childOperations, childLocals);
    const parameters = block.index ? `${block.item}, ${block.index}` : block.item;
    operations.push([
      'createEffect(() => {',
      `  clearChildren(${blockVariable});`,
      `  const ${valuesVariable} = (${transformExpression(block.expression, analysis, locals)}) ?? [];`,
      `  Array.from(${valuesVariable}).forEach((${parameters}) => {`,
      ...childOperations.map((operation) => indent(operation, 4)),
      '  });',
      '});',
    ].join('\n'));
    addInsert(operations, parent, blockVariable);
    return blockVariable;
  }

  const rootVariables = component.template.children.map((child) =>
    processNode(child, undefined, domOperations),
  );
  const importStatement = imports.size > 0
    ? `import { ${Array.from(imports).sort().join(', ')} } from '@fluxdom/runtime';\n`
    : '';
  const result = rootVariables.length === 0
    ? 'null'
    : rootVariables.length === 1
      ? rootVariables[0]
      : `[${rootVariables.join(', ')}]`;

  return `${importStatement}\nexport function render() {\n${domOperations.map((operation) => indent(operation, 2)).join('\n')}\n  return ${result};\n}`;
}

function transformExpression(expression: string, analysis: ComponentAnalysis, locals: Set<string>): string {
  const signals = new Set(Array.from(analysis.scriptAnalysis.signals).filter((signal) => !locals.has(signal)));
  let result = '';
  let cursor = 0;
  while (cursor < expression.length) {
    const character = expression[cursor];
    if (character === '"' || character === "'" || character === '`') {
      const start = cursor;
      cursor += 1;
      while (cursor < expression.length) {
        if (expression[cursor] === character && expression[cursor - 1] !== '\\') {
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      result += expression.slice(start, cursor);
      continue;
    }
    if (/[A-Za-z_$]/.test(character)) {
      const start = cursor;
      cursor += 1;
      while (cursor < expression.length && /[\w$]/.test(expression[cursor])) cursor += 1;
      const identifier = expression.slice(start, cursor);
      const propertyAccess = expression[start - 1] === '.';
      result += signals.has(identifier) && !propertyAccess ? `__${identifier}()` : identifier;
      continue;
    }
    result += character;
    cursor += 1;
  }
  return result;
}

function indent(source: string, spaces: number): string {
  const prefix = ' '.repeat(spaces);
  return source.split('\n').map((line) => `${prefix}${line}`).join('\n');
}
