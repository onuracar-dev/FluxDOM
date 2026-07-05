export function detectSignals(script) {
    const signals = new Set();
    const letRegex = /let\s+([a-zA-Z0-9_]+)\s*=/g;
    let match;
    while ((match = letRegex.exec(script)) !== null) {
        signals.add(match[1]);
    }
    return signals;
}
//# sourceMappingURL=signal-detector.js.map