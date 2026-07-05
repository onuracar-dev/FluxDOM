import { Route } from './matcher';
declare const currentPath: () => string;
declare const currentParams: () => Record<string, string>;
export declare function initRouter(appRoutes: Route[]): void;
export declare function navigate(path: string, options?: {
    replace?: boolean;
}): void;
export { currentPath, currentParams };
//# sourceMappingURL=navigation.d.ts.map