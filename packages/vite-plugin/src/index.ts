import type { Plugin } from 'vite';
import { compileSource } from '@fluxdom/compiler';

export function flowPlugin(): Plugin {
  // Map to store CSS extracted from .flow files
  const cssMap = new Map<string, string>();

  return {
    name: 'vite-plugin-FluxDOM',
    enforce: 'pre',

    resolveId(id) {
      // Handle the virtual CSS files we import in generated JS
      if (id.endsWith('.flow.css')) {
        return '\0' + id;
      }
      return null;
    },

    load(id) {
      if (id.startsWith('\0') && id.endsWith('.flow.css')) {
        const actualId = id.slice(1).replace('.css', '');
        return cssMap.get(actualId) || '';
      }
      return null;
    },

    transform(code, id) {
      if (!id.endsWith('.flow')) {
        return null;
      }

      try {
        const { js, css } = compileSource(code, id);

        // Store CSS for the virtual module loader
        if (css) {
          cssMap.set(id, css);
        }

        // Return the generated JS
        return {
          code: css ? `${js}\nimport ${JSON.stringify(`${id}.css`)};` : js,
          map: null, // Source maps are not fully implemented in prototype
        };
      } catch (err: any) {
        this.error({
          message: err.message,
          id,
        });
      }
    },
    
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.flow')) {
        // HMR implementation for the prototype
        // Tell Vite to fully reload the file
        server.ws.send({
          type: 'full-reload',
          path: '*'
        });
        return [];
      }
    }
  };
}
