export function transformStyle(styleContent: string, hash: string): string {
  if (!styleContent) return '';
  const scope = `[data-fluxdom="${hash}"]`;
  return styleContent.replace(/([^{}]+)\{/g, (full, rawSelector: string) => {
    const selector = rawSelector.trim();
    if (!selector || selector.startsWith('@') || isKeyframeSelector(selector)) return full;
    const scoped = selector.split(',').map((part) => scopeSelector(part.trim(), scope)).join(', ');
    const leadingWhitespace = rawSelector.match(/^\s*/)?.[0] ?? '';
    return `${leadingWhitespace}${scoped} {`;
  });
}

function scopeSelector(selector: string, scope: string): string {
  if (selector === ':root' || selector.includes(':global(')) return selector;
  const pseudoIndex = selector.search(/:{1,2}[A-Za-z-]/);
  if (pseudoIndex < 0) return `${selector}${scope}`;
  return `${selector.slice(0, pseudoIndex)}${scope}${selector.slice(pseudoIndex)}`;
}

function isKeyframeSelector(selector: string): boolean {
  return selector === 'from' || selector === 'to' || /^\d+(?:\.\d+)?%$/.test(selector);
}
