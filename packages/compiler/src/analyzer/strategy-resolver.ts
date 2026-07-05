import { FlowComponent } from '../parser/ast.js';
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
  strategy: RenderStrategy;
}

export function analyze(component: FlowComponent): ComponentAnalysis {
  const scriptContent = component.script?.content || '';
  const signals = detectSignals(scriptContent);
  const hasAsync = /await\s|fetch\(/.test(scriptContent);
  const hasSideEffects = /window\.|document\.|localStorage/.test(scriptContent);

  let strategy: RenderStrategy = 'SSG';
  if (hasSideEffects) strategy = 'CSR';
  else if (hasAsync || signals.size > 0) strategy = 'SSR';

  return {
    component,
    scriptAnalysis: { signals, hasAsync, hasSideEffects },
    strategy
  };
}
