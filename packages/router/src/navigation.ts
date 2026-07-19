import { createSignal } from '@fluxdom/runtime';
import { Route, matchRoute } from './matcher.js';

let routes: Route[] = [];

// Signal for current path so components can react to navigation
const initialPath = typeof window === 'undefined' ? '/' : window.location.pathname;
const [currentPath, setCurrentPath] = createSignal(initialPath);
const [currentParams, setCurrentParams] = createSignal<Record<string, string>>({});

export function initRouter(appRoutes: Route[]) {
  if (typeof window === 'undefined') {
    throw new Error('@fluxdom/router can only be initialized in a browser');
  }
  routes = appRoutes;
  
  // Handle popstate (back/forward buttons)
  window.addEventListener('popstate', () => {
    handleNavigation(window.location.pathname);
  });

  // Initial navigation
  handleNavigation(window.location.pathname);
}

export function navigate(path: string, options: { replace?: boolean } = {}) {
  if (typeof window === 'undefined') {
    throw new Error('@fluxdom/router navigation requires a browser');
  }
  if (options.replace) {
    window.history.replaceState(null, '', path);
  } else {
    window.history.pushState(null, '', path);
  }
  handleNavigation(path);
}

function handleNavigation(path: string) {
  const match = matchRoute(path, routes);
  
  if (match) {
    setCurrentPath(path);
    setCurrentParams(match.params);
    
    // In a full implementation, we would mount the matched component to the DOM here
    // For this phase, we just update the reactive signals
  } else {
    console.error(`No route found for ${path}`);
    // Handle 404
  }
}

export { currentPath, currentParams };
