import { parse } from './parser/index.js';
import { analyze } from './analyzer/index.js';
import { transformScript } from './transformer/signal-transform.js';
import { transformTemplate } from './transformer/template-transform.js';
import { transformStyle } from './transformer/style-transform.js';
import { createHash } from 'crypto';
export function compileSource(source, filename) {
    const component = parse(source, filename);
    const analysis = analyze(component);
    const hash = createHash('md5').update(filename).digest('hex').substring(0, 8);
    let js = '';
    js += transformScript(analysis) + '\n';
    js += transformTemplate(analysis) + '\n';
    js += `export const __flowStrategy = '${analysis.strategy}';\n`;
    let css = '';
    if (component.style) {
        css = transformStyle(component.style.content, hash);
    }
    return { js, css, strategy: analysis.strategy };
}
//# sourceMappingURL=index.js.map