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

export function detectSignalsFromAst(ast: any, filename = 'unknown.flow'): Set<string> {
  const signals = new Set<string>();
  if (!ast || !ast.program || !Array.isArray(ast.program.body)) return signals;

  // Pass 1: detect top-level let signals and validate declarations
  for (const node of ast.program.body) {
    const isExport = node.type === 'ExportNamedDeclaration';
    const declNode = isExport ? node.declaration : node;

    if (declNode && declNode.type === 'VariableDeclaration' && declNode.kind === 'let') {
      for (const decl of declNode.declarations) {
        if (!decl.id || decl.id.type !== 'Identifier') {
          throw new FlowParseError(
            'Destructuring in a top-level let is not supported. Declare each signal separately: let a = obj.a;',
            filename,
          );
        }
        if (isExport) {
          throw new FlowParseError(
            `Signals cannot be exported from a .flow script ('${decl.id.name}'). Move shared state to @fluxdom/store.`,
            filename,
          );
        }
        signals.add(decl.id.name);
      }
    }
  }

  // Pass 2: validate export specifiers
  for (const node of ast.program.body) {
    if (node.type === 'ExportNamedDeclaration' && Array.isArray(node.specifiers)) {
      for (const spec of node.specifiers) {
        const localName = spec.local?.name;
        if (localName && signals.has(localName)) {
          throw new FlowParseError(
            `Signals cannot be exported from a .flow script ('${localName}'). Move shared state to @fluxdom/store.`,
            filename,
          );
        }
      }
    }
  }

  return signals;
}

export function detectSignals(script: string, filename = 'unknown.flow'): Set<string> {
  if (!script || !script.trim()) return new Set<string>();
  const ast = parseScriptAst(script, filename);
  return detectSignalsFromAst(ast, filename);
}
