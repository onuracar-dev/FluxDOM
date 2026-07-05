import { FlowComponent } from '../parser/ast.js';
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
export declare function analyze(component: FlowComponent): ComponentAnalysis;
//# sourceMappingURL=strategy-resolver.d.ts.map