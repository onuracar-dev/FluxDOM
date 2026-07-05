import { RenderStrategy } from './analyzer';
export interface CompileResult {
    js: string;
    css: string;
    strategy: RenderStrategy;
}
export declare function compileSource(source: string, filename: string): CompileResult;
//# sourceMappingURL=index.d.ts.map