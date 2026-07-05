import { createSignal } from '@fluxdom/runtime';
import { Route, RouteMatch, matchRoute } from './matcher';

let routes: Route[] = [];

// Signal for current path so components can react to navigation
const [currentPath, setCurrentPath] = createSignal(window.location.pathname);
const [currentParams, setCurrentParams] = createSignal<Record<string, string>>({});

export function initRouter(appRoutes: Route[]) {
  routes = appRoutes;
  
  // Handle popstate (back/forward buttons)
  window.addEventListener('popstate', () => {
    handleNavigation(window.location.pathname);
  });

  // Initial navigation
  handleNavigation(window.location.pathname);
}

export function navigate(path: string, options: { replace?: boolean } = {}) {
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
