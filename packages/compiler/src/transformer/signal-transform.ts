import type { ComponentAnalysis } from '../analyzer/index.js';
import { parseScriptAst } from '../analyzer/signal-detector.js';
import { rewriteAst } from './ast-rewriter.js';

export function transformScript(analysis: ComponentAnalysis, filename: string = analysis.component.filename ?? 'unknown.flow'): string {
  const { component, scriptAnalysis } = analysis;
  if (!component.script || !component.script.content.trim()) return '';

  const code = component.script.content;
  const ast = scriptAnalysis.ast ?? parseScriptAst(code, filename);
  let transformed = rewriteAst(ast, code, scriptAnalysis.signals, filename, { isScript: true });

  if (scriptAnalysis.signals.size > 0) {
    transformed = `import { createSignal } from '@fluxdom/runtime';\n${transformed}`;
  }

  return transformed;
}
