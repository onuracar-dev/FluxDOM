import { render } from './App.flow';
import { insert } from '@fluxdom/runtime';
const root = document.getElementById('app');
if (root) {
    const elements = render();
    if (Array.isArray(elements)) {
        elements.forEach(el => insert(root, el));
    }
    else {
        insert(root, elements);
    }
}
//# sourceMappingURL=main.js.map