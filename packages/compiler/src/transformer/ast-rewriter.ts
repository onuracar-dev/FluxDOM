import MagicString from 'magic-string';
import { FlowParseError } from '../parser/index.js';

export class Scope {
  parent: Scope | null;
  bindings: Set<string>;

  constructor(parent: Scope | null = null, bindings: string[] = []) {
    this.parent = parent;
    this.bindings = new Set(bindings);
  }

  add(name: string): void {
    this.bindings.add(name);
  }

  has(name: string): boolean {
    if (this.bindings.has(name)) return true;
    return this.parent ? this.parent.has(name) : false;
  }
}

export function collectPatternBindings(pattern: any, bindings: Set<string>): void {
  if (!pattern) return;
  if (pattern.type === 'Identifier') {
    bindings.add(pattern.name);
  } else if (pattern.type === 'AssignmentPattern') {
    collectPatternBindings(pattern.left, bindings);
  } else if (pattern.type === 'ArrayPattern') {
    for (const elem of pattern.elements) {
      if (elem) collectPatternBindings(elem, bindings);
    }
  } else if (pattern.type === 'ObjectPattern') {
    for (const prop of pattern.properties) {
      if (prop.type === 'RestElement') {
        collectPatternBindings(prop.argument, bindings);
      } else if (prop.type === 'ObjectProperty') {
        collectPatternBindings(prop.value, bindings);
      }
    }
  } else if (pattern.type === 'RestElement') {
    collectPatternBindings(pattern.argument, bindings);
  }
}

export function hoistBlockBindings(bodyNodes: any[], scope: Scope): void {
  if (!Array.isArray(bodyNodes)) return;
  for (const stmt of bodyNodes) {
    if (!stmt) continue;
    if (stmt.type === 'VariableDeclaration') {
      for (const decl of stmt.declarations) {
        collectPatternBindings(decl.id, scope.bindings);
      }
    } else if (stmt.type === 'FunctionDeclaration' && stmt.id) {
      scope.add(stmt.id.name);
    } else if (stmt.type === 'ClassDeclaration' && stmt.id) {
      scope.add(stmt.id.name);
    }
  }
}

function findSignalInPattern(pattern: any, signals: Set<string>, scope: Scope): string | null {
  if (!pattern) return null;
  if (pattern.type === 'Identifier') {
    if (signals.has(pattern.name) && !scope.has(pattern.name)) {
      return pattern.name;
    }
    return null;
  }
  if (pattern.type === 'ArrayPattern') {
    for (const elem of pattern.elements) {
      const found = findSignalInPattern(elem, signals, scope);
      if (found) return found;
    }
  }
  if (pattern.type === 'ObjectPattern') {
    for (const prop of pattern.properties) {
      if (prop.type === 'RestElement') {
        const found = findSignalInPattern(prop.argument, signals, scope);
        if (found) return found;
      } else if (prop.type === 'ObjectProperty') {
        const found = findSignalInPattern(prop.value, signals, scope);
        if (found) return found;
      }
    }
  }
  if (pattern.type === 'RestElement') {
    return findSignalInPattern(pattern.argument, signals, scope);
  }
  if (pattern.type === 'AssignmentPattern') {
    return findSignalInPattern(pattern.left, signals, scope);
  }
  return null;
}

const TS_EXPRESSION_NODES = new Set([
  'TSAsExpression',
  'TSTypeAssertion',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSInstantiationExpression',
]);

export function rewriteAst(
  ast: any,
  sourceCode: string,
  signals: Set<string>,
  filename: string,
  options: { isScript?: boolean; initialScope?: Set<string> } = {},
): string {
  const s = new MagicString(sourceCode);
  const rootScope = new Scope(null, options.initialScope ? Array.from(options.initialScope) : []);

  function walk(node: any, scope: Scope, isTopLevelStmt = false): void {
    if (!node || typeof node !== 'object') return;

    // TypeScript nodes: skip pure type annotations, walk runtime expressions
    if (typeof node.type === 'string' && node.type.startsWith('TS')) {
      if (TS_EXPRESSION_NODES.has(node.type) && node.expression) {
        walk(node.expression, scope);
      }
      return;
    }

    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration?.type === 'VariableDeclaration' && node.declaration.kind === 'let') {
        const firstDecl = node.declaration.declarations[0];
        const name = firstDecl?.id?.name ?? 'unknown';
        throw new FlowParseError(
          `Signals cannot be exported from a .flow script ('${name}'). Move shared state to @fluxdom/store.`,
          filename,
        );
      }
      if (Array.isArray(node.specifiers)) {
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
      if (node.declaration) {
        walk(node.declaration, scope, false);
      }
      return;
    }

    if (node.type === 'VariableDeclaration') {
      if (options.isScript && isTopLevelStmt && node.kind === 'let') {
        for (const decl of node.declarations) {
          if (!decl.id || decl.id.type !== 'Identifier') {
            throw new FlowParseError(
              'Destructuring in a top-level let is not supported. Declare each signal separately: let a = obj.a;',
              filename,
            );
          }
        }

        // Transform init expressions of declarators first
        for (const decl of node.declarations) {
          if (decl.init) {
            walk(decl.init, scope);
          }
        }
        const transformedDecls: string[] = [];
        for (const decl of node.declarations) {
          if (decl.id && decl.id.type === 'Identifier') {
            const name = decl.id.name;
            const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
            const initText = decl.init ? s.slice(decl.init.start, decl.init.end) : 'undefined';
            transformedDecls.push(`const [__${name}, __set${capitalized}] = createSignal(${initText});`);
          }
        }
        s.overwrite(node.start, node.end, transformedDecls.join('\n'));
        return;
      }

      // Non-top-level or non-let variable declarations
      for (const decl of node.declarations) {
        collectPatternBindings(decl.id, scope.bindings);
        if (decl.init) {
          walk(decl.init, scope);
        }
      }
      return;
    }

    if (node.type === 'FunctionDeclaration') {
      if (node.id) {
        scope.add(node.id.name);
      }
      const fnScope = new Scope(scope);
      for (const param of node.params) {
        collectPatternBindings(param, fnScope.bindings);
      }
      if (node.body?.body) {
        hoistBlockBindings(node.body.body, fnScope);
      }
      walk(node.body, fnScope);
      return;
    }

    if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      const fnScope = new Scope(scope);
      if (node.id) {
        fnScope.add(node.id.name);
      }
      for (const param of node.params) {
        collectPatternBindings(param, fnScope.bindings);
      }
      if (node.body?.type === 'BlockStatement' && node.body.body) {
        hoistBlockBindings(node.body.body, fnScope);
        walk(node.body, fnScope);
      } else {
        walk(node.body, fnScope);
      }
      return;
    }

    if (node.type === 'CatchClause') {
      const catchScope = new Scope(scope);
      if (node.param) {
        collectPatternBindings(node.param, catchScope.bindings);
      }
      if (node.body?.body) {
        hoistBlockBindings(node.body.body, catchScope);
      }
      walk(node.body, catchScope);
      return;
    }

    if (node.type === 'BlockStatement') {
      const blockScope = new Scope(scope);
      hoistBlockBindings(node.body, blockScope);
      for (const stmt of node.body) {
        walk(stmt, blockScope);
      }
      return;
    }

    if (node.type === 'ForStatement') {
      const loopScope = new Scope(scope);
      if (node.init?.type === 'VariableDeclaration') {
        for (const decl of node.init.declarations) {
          collectPatternBindings(decl.id, loopScope.bindings);
        }
      }
      walk(node.init, loopScope);
      walk(node.test, loopScope);
      walk(node.update, loopScope);
      walk(node.body, loopScope);
      return;
    }

    if (node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
      const loopScope = new Scope(scope);
      if (node.left?.type === 'VariableDeclaration') {
        for (const decl of node.left.declarations) {
          collectPatternBindings(decl.id, loopScope.bindings);
        }
      }
      walk(node.left, loopScope);
      walk(node.right, loopScope);
      walk(node.body, loopScope);
      return;
    }

    if (node.type === 'SwitchStatement') {
      const switchScope = new Scope(scope);
      for (const caseNode of node.cases) {
        hoistBlockBindings(caseNode.consequent, switchScope);
      }
      walk(node.discriminant, switchScope);
      for (const caseNode of node.cases) {
        walk(caseNode, switchScope);
      }
      return;
    }

    if (node.type === 'AssignmentExpression') {
      if (node.left.type === 'ArrayPattern' || node.left.type === 'ObjectPattern') {
        const sig = findSignalInPattern(node.left, signals, scope);
        if (sig) {
          throw new FlowParseError(`Destructuring assignment to signal '${sig}' is not supported yet`, filename);
        }
        walk(node.left, scope);
        walk(node.right, scope);
        return;
      }

      if (node.left.type === 'Identifier' && signals.has(node.left.name) && !scope.has(node.left.name)) {
        const name = node.left.name;
        const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
        const setter = `__set${capitalized}`;
        const getter = `__${name}`;
        walk(node.right, scope);
        const rightText = s.slice(node.right.start, node.right.end);
        if (node.operator === '=') {
          s.overwrite(node.start, node.end, `${setter}(${rightText})`);
        } else {
          const binOp = node.operator.slice(0, -1);
          s.overwrite(node.start, node.end, `${setter}(${getter}() ${binOp} ${rightText})`);
        }
        return;
      }

      walk(node.left, scope);
      walk(node.right, scope);
      return;
    }

    if (node.type === 'UpdateExpression') {
      if (node.argument.type === 'Identifier' && signals.has(node.argument.name) && !scope.has(node.argument.name)) {
        const name = node.argument.name;
        const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
        const setter = `__set${capitalized}`;
        const getter = `__${name}`;
        if (node.operator === '++') {
          s.overwrite(node.start, node.end, `${setter}(${getter}() + 1)`);
        } else if (node.operator === '--') {
          s.overwrite(node.start, node.end, `${setter}(${getter}() - 1)`);
        }
        return;
      }
      walk(node.argument, scope);
      return;
    }

    if (node.type === 'ObjectMethod') {
      if (node.computed) {
        walk(node.key, scope);
      }
      const methodScope = new Scope(scope);
      for (const param of node.params) {
        collectPatternBindings(param, methodScope.bindings);
      }
      if (node.body?.body) {
        hoistBlockBindings(node.body.body, methodScope);
      }
      walk(node.body, methodScope);
      return;
    }

    if (node.type === 'ClassMethod' || node.type === 'ClassPrivateMethod') {
      if (node.computed) {
        walk(node.key, scope);
      }
      const methodScope = new Scope(scope);
      for (const param of node.params) {
        collectPatternBindings(param, methodScope.bindings);
      }
      if (node.body?.body) {
        hoistBlockBindings(node.body.body, methodScope);
      }
      walk(node.body, methodScope);
      return;
    }

    if (node.type === 'ClassProperty' || node.type === 'ClassPrivateProperty') {
      if (node.computed) {
        walk(node.key, scope);
      }
      if (node.value) {
        walk(node.value, scope);
      }
      return;
    }

    if (node.type === 'LabeledStatement') {
      walk(node.body, scope);
      return;
    }

    if (node.type === 'BreakStatement' || node.type === 'ContinueStatement') {
      return;
    }

    if (node.type === 'ObjectProperty') {
      if (node.shorthand && node.key.type === 'Identifier') {
        const name = node.key.name;
        if (signals.has(name) && !scope.has(name)) {
          s.overwrite(node.start, node.end, `${name}: __${name}()`);
          return;
        }
      }
      if (node.computed) {
        walk(node.key, scope);
      }
      walk(node.value, scope);
      return;
    }

    if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
      walk(node.object, scope);
      if (node.computed) {
        walk(node.property, scope);
      }
      return;
    }

    if (node.type === 'Identifier') {
      if (signals.has(node.name) && !scope.has(node.name)) {
        s.overwrite(node.start, node.end, `__${node.name}()`);
      }
      return;
    }

    // Default traversal for any other AST node
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'comments' || key === 'extra') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        const isProgramBody = node.type === 'Program' && key === 'body';
        for (const item of child) {
          if (item && typeof item === 'object' && typeof item.type === 'string') {
            walk(item, scope, isProgramBody);
          }
        }
      } else if (child && typeof child === 'object' && typeof child.type === 'string') {
        walk(child, scope, false);
      }
    }
  }

  walk(ast, rootScope);
  return s.toString();
}
