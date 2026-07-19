# @fluxdom/cli

Scaffolding and Vite command wrappers for the FluxDOM prototype.

```bash
npx @fluxdom/cli create my-flow-app
cd my-flow-app
npm install
npm run dev
```

The CLI refuses to overwrite a non-empty target directory. Generated apps use
the experimental `@fluxdom/runtime` and `@fluxdom/vite-plugin` packages.
