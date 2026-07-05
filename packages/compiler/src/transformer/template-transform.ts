import { ComponentAnalysis } from '../analyzer/index.js';
import { ElementNode, ExpressionNode, TemplateNode, TextNode } from '../parser/ast.js';

export function transformTemplate(analysis: ComponentAnalysis): string {
  const { component } = analysis;
  if (!component.template) return 'return null;';

  let imports = new Set<string>();
  let domOps: string[] = [];
  let variableCounter = 0;

  function genVar(prefix: string) {
    return `__${prefix}${variableCounter++}`;
  }

  function processNode(node: TemplateNode, parentVar?: string): string {
    if (node.type === 'Element') {
      const el = node as ElementNode;
      const elVar = genVar('el');
      imports.add('createElement');
      domOps.push(`const ${elVar} = createElement('${el.tag}');`);

      for (const [key, value] of Object.entries(el.attributes)) {
        imports.add('setAttribute');
        domOps.push(`setAttribute(${elVar}, '${key}', '${value}');`);
      }

      for (const [event, handler] of Object.entries(el.events)) {
        imports.add('addEventListener');
        domOps.push(`addEventListener(${elVar}, '${event}', ${handler});`);
      }

      for (const child of el.children) {
        processNode(child, elVar);
      }

      if (parentVar) {
        imports.add('insert');
        domOps.push(`insert(${parentVar}, ${elVar});`);
      }
      return elVar;
    } else if (node.type === 'Text') {
      const text = node as TextNode;
      const textVar = genVar('text');
      imports.add('createText');
      domOps.push(`const ${textVar} = createText(\`${text.content}\`);`);
      if (parentVar) {
        imports.add('insert');
        domOps.push(`insert(${parentVar}, ${textVar});`);
      }
      return textVar;
    } else if (node.type === 'Expression') {
      const expr = node as ExpressionNode;
      const exprVar = genVar('expr');
      imports.add('createText');
      imports.add('createEffect');
      imports.add('setText');
      imports.add('insert');

      domOps.push(`const ${exprVar} = createText('');`);
      
      // Need to transform the expression to use signal getter if it's a signal
      // E.g., {count} -> {__count()}
      // For this prototype, we'll assume the script transform already handled it if we do it right
      // But the expression is parsed separately. We'll naive replace signal names.
      let exprContent = expr.content;
      for (const sig of analysis.scriptAnalysis.signals) {
        const readRegex = new RegExp(`(?<!\\.)\\b${sig}\\b`, 'g');
        exprContent = exprContent.replace(readRegex, `__${sig}()`);
      }

      domOps.push(`createEffect(() => { setText(${exprVar}, String(${exprContent})); });`);
      
      if (parentVar) {
        domOps.push(`insert(${parentVar}, ${exprVar});`);
      }
      return exprVar;
    }
    return '';
  }

  const rootVars = component.template.children.map(child => processNode(child));

  const importStr = imports.size > 0 
    ? `import { ${Array.from(imports).join(', ')} } from '@fluxdom/runtime';\n`
    : '';

  const renderFn = `
export function render() {
${domOps.map(op => `  ${op}`).join('\n')}
  return ${rootVars.length === 1 ? rootVars[0] : `[${rootVars.join(', ')}]`};
}
`;

  return importStr + renderFn;
}
