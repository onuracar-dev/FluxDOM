export function matchRoute(url, routes) {
    const urlObj = new URL(url, 'http://localhost');
    const pathname = urlObj.pathname;
    for (const route of routes) {
        const params = {};
        // Convert route path to regex
        // e.g. /blog/[slug] -> ^/blog/([^/]+)$
        const regexPath = route.path.replace(/\[([^\]]+)\]/g, (_, paramName) => {
            return '([^/]+)';
        }).replace(/\//g, '\\/');
        const regex = new RegExp(`^${regexPath}$`);
        const match = pathname.match(regex);
        if (match) {
            // Extract param names
            const paramNames = [];
            const paramRegex = /\[([^\]]+)\]/g;
            let paramMatch;
            while ((paramMatch = paramRegex.exec(route.path)) !== null) {
                paramNames.push(paramMatch[1]);
            }
            // Assign matched values
            paramNames.forEach((name, index) => {
                params[name] = match[index + 1];
            });
            return { route, params };
        }
    }
    return null;
}
//# sourceMappingURL=matcher.js.map