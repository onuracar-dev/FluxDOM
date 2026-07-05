export function detectSignals(script: string): Set<string> {
  const signals = new Set<string>();
  const letRegex = /let\s+([a-zA-Z0-9_]+)\s*=/g;
  let match;
  while ((match = letRegex.exec(script)) !== null) {
    signals.add(match[1]);
  }
  return signals;
}
