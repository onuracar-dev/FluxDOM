export function transformStyle(styleContent: string, hash: string): string {
  if (!styleContent) return '';
  return styleContent.replace(/([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/ig, (match) => {
    if (match.includes('@') || match.includes(':root')) return match;
    const parts = match.split('{');
    const selector = parts[0].trim();
    return `${selector}[data-fluxdom="${hash}"] {${parts[1] || ''}`;
  });
}
