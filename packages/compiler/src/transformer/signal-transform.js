export function transformScript(analysis) {
    const { component, scriptAnalysis } = analysis;
    if (!component.script)
        return '';
    let code = component.script.content;
    // Extremely basic string replacement for prototype
    // In reality, this would use AST traversal to correctly scope and replace
    // variable declarations, references, and assignments.
    // 1. Transform signal declarations
    // let x = 0; -> const [__x, __setX] = createSignal(0);
    for (const sig of scriptAnalysis.signals) {
        const regex = new RegExp(`let\\s+${sig}\\s*=\\s*(.*?);`, 'g');
        const capitalizedSig = sig.charAt(0).toUpperCase() + sig.slice(1);
        code = code.replace(regex, `const [__${sig}, __set${capitalizedSig}] = createSignal($1);`);
        // Replace reassignments: x = 1; -> __setX(1);
        const reassignRegex = new RegExp(`\\b${sig}\\s*=\\s*(.*?);`, 'g');
        code = code.replace(reassignRegex, `__set${capitalizedSig}($1);`);
        // Replace ++ and -- (very naive)
        const incRegex = new RegExp(`\\b${sig}\\+\\+`, 'g');
        code = code.replace(incRegex, `__set${capitalizedSig}(__${sig}() + 1)`);
        // Replace reads: x -> __x()
        // This is hard to do with regex without breaking other things (like property access obj.x)
        // We'll do a naive replace only if it's not preceded by a dot
        const readRegex = new RegExp(`(?<!\\.)\\b${sig}\\b`, 'g');
        code = code.replace(readRegex, `__${sig}()`);
    }
    // 2. Add imports
    if (scriptAnalysis.signals.size > 0) {
        code = `import { createSignal } from '@fluxdom/runtime';\n${code}`;
    }
    return code;
}
//# sourceMappingURL=signal-transform.js.map