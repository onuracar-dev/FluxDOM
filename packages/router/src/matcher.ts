export interface Route {
  path: string;
  component: () => Promise<any>;
}

export interface RouteMatch {
  route: Route;
  params: Record<string, string>;
}

interface CompiledRoute {
  regex: RegExp;
  paramNames: string[];
}

const routeCache = new WeakMap<Route, CompiledRoute>();

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileRoutePath(path: string): CompiledRoute {
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

function getCompiledRoute(route: Route): CompiledRoute {
  let compiled = routeCache.get(route);
  if (!compiled) {
    compiled = compileRoutePath(route.path);
    routeCache.set(route, compiled);
  }
  return compiled;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function matchRoute(url: string, routes: Route[]): RouteMatch | null {
  const urlObj = new URL(url, 'http://localhost');
  const pathname = urlObj.pathname;

  for (const route of routes) {
    const params: Record<string, string> = {};
    const { regex, paramNames } = getCompiledRoute(route);
    const match = pathname.match(regex);

    if (match) {
      paramNames.forEach((name, index) => {
        params[name] = safeDecode(match[index + 1]);
      });

      return { route, params };
    }
  }

  return null;
}
