import { detectSignals } from './signal-detector.js';
export function analyze(component) {
    const scriptContent = component.script?.content || '';
    const signals = detectSignals(scriptContent);
    const hasAsync = /await\s|fetch\(/.test(scriptContent);
    const hasSideEffects = /window\.|document\.|localStorage/.test(scriptContent);
    let strategy = 'SSG';
    if (hasSideEffects)
        strategy = 'CSR';
    else if (hasAsync || signals.size > 0)
        strategy = 'SSR';
    return {
        component,
        scriptAnalysis: { signals, hasAsync, hasSideEffects },
        strategy
    };
}
//# sourceMappingURL=strategy-resolver.js.map