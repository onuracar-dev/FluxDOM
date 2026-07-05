export interface Route {
    path: string;
    component: () => Promise<any>;
}
export interface RouteMatch {
    route: Route;
    params: Record<string, string>;
}
export declare function matchRoute(url: string, routes: Route[]): RouteMatch | null;
//# sourceMappingURL=matcher.d.ts.map