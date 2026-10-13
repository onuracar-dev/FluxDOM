import { parse as babelParse } from '@babel/parser';
import { FlowParseError } from '../parser/index.js';

export function parseScriptAst(script: string, filename = 'unknown.flow') {
  try {
    return babelParse(script, {
      sourceType: 'module',
      plugins: ['typescript'],
    });
  } catch (err: any) {
    if (err instanceof FlowParseError) throw err;
    const loc = err.loc ? ` (${err.loc.line}:${err.loc.column})` : '';
    throw new FlowParseError(`${err.message}${loc}`, filename);
  }
}

export function detectSignalsFromAst(ast: any): Set<string> {
  const signals = new Set<string>();
  if (!ast || !ast.program || !Array.isArray(ast.program.body)) return signals;

  for (const node of ast.program.body) {
    let declNode = node;
    if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      declNode = node.declaration;
    }
    if (declNode.type === 'VariableDeclaration' && declNode.kind === 'let') {
      for (const decl of declNode.declarations) {
        if (decl.id && decl.id.type === 'Identifier') {
          signals.add(decl.id.name);
        }
      }
    }
  }
  return signals;
}

export function detectSignals(script: string, filename = 'unknown.flow'): Set<string> {
  if (!script || !script.trim()) return new Set<string>();
  const ast = parseScriptAst(script, filename);
  return detectSignalsFromAst(ast);
}
