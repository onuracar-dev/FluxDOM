import type { FlowComponent, TemplateNode } from '../parser/ast.js';
import { detectSignals } from './signal-detector.js';

export type RenderStrategy = 'SSG' | 'SSR' | 'CSR';

export interface ScriptAnalysis {
  signals: Set<string>;
  hasAsync: boolean;
  hasSideEffects: boolean;
}

export interface ComponentAnalysis {
  component: FlowComponent;
  scriptAnalysis: ScriptAnalysis;
  templateAnalysis: TemplateAnalysis;
  strategy: RenderStrategy;
}

export interface TemplateAnalysis {
  hasBindings: boolean;
  hasDirectives: boolean;
  hasEvents: boolean;
  hasExpressions: boolean;
}

export function analyze(component: FlowComponent): ComponentAnalysis {
  const scriptContent = component.script?.content || '';
  const signals = detectSignals(scriptContent);
  const hasAsync = /await\s|fetch\(/.test(scriptContent);
  const hasSideEffects = /window\.|document\.|localStorage/.test(scriptContent);
  const templateAnalysis: TemplateAnalysis = {
    hasBindings: false,
    hasDirectives: false,
    hasEvents: false,
    hasExpressions: false,
  };
  for (const node of component.template?.children ?? []) analyzeTemplateNode(node, templateAnalysis);

  let strategy: RenderStrategy = 'SSG';
  if (hasSideEffects || templateAnalysis.hasEvents) strategy = 'CSR';
  else if (
    hasAsync ||
    signals.size > 0 ||
    templateAnalysis.hasBindings ||
    templateAnalysis.hasDirectives ||
    templateAnalysis.hasExpressions
  ) strategy = 'SSR';

  return {
    component,
    scriptAnalysis: { signals, hasAsync, hasSideEffects },
    templateAnalysis,
    strategy
  };
}

function analyzeTemplateNode(node: TemplateNode, result: TemplateAnalysis): void {
  if (node.type === 'Expression') {
    result.hasExpressions = true;
    return;
  }
  if (node.type === 'IfBlock' || node.type === 'EachBlock') {
    result.hasDirectives = true;
    for (const child of node.children) analyzeTemplateNode(child, result);
    return;
  }
  if (node.type === 'Element') {
    if (Object.keys(node.events).length > 0) result.hasEvents = true;
    if (Object.keys(node.bindings).length > 0) result.hasBindings = true;
    for (const child of node.children) analyzeTemplateNode(child, result);
  }
}
