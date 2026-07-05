export function transformStyle(styleContent, hash) {
    if (!styleContent)
        return '';
    return styleContent.replace(/([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/ig, (match) => {
        if (match.includes('@') || match.includes(':root'))
            return match;
        const parts = match.split('{');
        const selector = parts[0].trim();
        return `${selector}[data-fluxdom="${hash}"] {${parts[1] || ''}`;
    });
}
//# sourceMappingURL=style-transform.js.map