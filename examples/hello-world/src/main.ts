import { render } from './App.flow';
import { insert } from '@fluxdom/runtime';

// Setup app
const root = document.getElementById('app');
if (root) {
  // Render component
  const elements = render();
  
  // Mount to DOM
  if (Array.isArray(elements)) {
    elements.forEach(el => insert(root, el));
  } else {
    insert(root, elements);
  }
}
