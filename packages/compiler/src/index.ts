import { parse } from './parser/index.js';
import { analyze, RenderStrategy } from './analyzer/index.js';
import { transformScript } from './transformer/signal-transform.js';
import { transformTemplate } from './transformer/template-transform.js';
import { transformStyle } from './transformer/style-transform.js';
import { createHash } from 'crypto';

export interface CompileResult {
  js: string;
  css: string;
  strategy: RenderStrategy;
}

export function compileSource(source: string, filename: string): CompileResult {
  const component = parse(source, filename);
  const analysis = analyze(component);

  const hash = createHash('md5').update(filename).digest('hex').substring(0, 8);
  
  let js = '';
  js += transformScript(analysis) + '\n';
  js += transformTemplate(analysis, component.style?.scoped ? hash : undefined) + '\n';
  js += `export const __flowStrategy = '${analysis.strategy}';\n`;

  let css = '';
  if (component.style) {
    css = component.style.scoped
      ? transformStyle(component.style.content, hash)
      : component.style.content;
  }

  return { js, css, strategy: analysis.strategy };
}

export { parse, FlowParseError } from './parser/index.js';
export type * from './parser/ast.js';
export { analyze } from './analyzer/index.js';
export type { ComponentAnalysis, RenderStrategy, ScriptAnalysis, TemplateAnalysis } from './analyzer/index.js';
