import { compileSource } from '@fluxdom/compiler';
import { renderToString as serverRender } from '@fluxdom/server';
export function renderToString(source) {
    const { js, strategy } = compileSource(source, 'ssr.flow');
    if (strategy === 'CSR') {
        return `<div id="app"></div><!-- CSR: Hydration required -->`;
    }
    // Create a function from the compiled JS
    // In a real environment, Vite's ssrLoadModule would evaluate the module
    // For the prototype stringifier, we'll extract the render function logic
    // and pass it to our server stringifier.
    try {
        // Very unsafe eval for prototype! In prod, use Node's vm module or Vite's SSR APIs.
        const exports = {};
        const moduleFn = new Function('exports', 'require', js.replace(/import .*? from .*?;/g, '') // strip imports for this basic eval
        );
        moduleFn(exports, require);
        if (exports.render) {
            return serverRender(exports.render);
        }
    }
    catch (e) {
        console.error("SSR Eval error:", e);
    }
    return `<div id="app"><h1>Error during SSR Render</h1></div>`;
}
//# sourceMappingURL=ssr.js.map