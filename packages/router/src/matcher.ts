export interface Route {
  path: string;
  component: () => Promise<any>;
}

export interface RouteMatch {
  route: Route;
  params: Record<string, string>;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileRoutePath(path: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const parameterPattern = /\[([^\]]+)\]/g;
  let regexPath = '';
  let cursor = 0;
  let parameterMatch: RegExpExecArray | null;

  while ((parameterMatch = parameterPattern.exec(path)) !== null) {
    regexPath += escapeRegex(path.slice(cursor, parameterMatch.index));
    regexPath += '([^/]+)';
    paramNames.push(parameterMatch[1]);
    cursor = parameterMatch.index + parameterMatch[0].length;
  }

  regexPath += escapeRegex(path.slice(cursor));
  return { regex: new RegExp(`^${regexPath}$`), paramNames };
}

export function matchRoute(url: string, routes: Route[]): RouteMatch | null {
  const urlObj = new URL(url, 'http://localhost');
  const pathname = urlObj.pathname;

  for (const route of routes) {
    const params: Record<string, string> = {};
    const { regex, paramNames } = compileRoutePath(route.path);
    const match = pathname.match(regex);

    if (match) {
      // Assign matched values
      paramNames.forEach((name, index) => {
        params[name] = match[index + 1];
      });

      return { route, params };
    }
  }

  return null;
}
