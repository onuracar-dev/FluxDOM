# FluxDOM

Experimental `.flow` component compiler and fine-grained DOM runtime.

FluxDOM is a monorepo experiment around adaptive rendering. It explores how a compiler can analyze single-file components, generate direct DOM operations, and avoid a Virtual DOM while still giving developers a simple component format.

## Why It Exists

Frontend projects often force developers to choose between SSG, SSR, CSR, and partial hydration early. FluxDOM explores a compiler-driven path:

- parse `.flow` single-file components
- analyze script and template behavior
- infer a rendering strategy
- generate focused DOM operations
- keep runtime reactivity small

## Monorepo Packages

- `@fluxdom/compiler` - parses, analyzes, and transforms `.flow` files
- `@fluxdom/runtime` - signals, effects, DOM helpers, and hydration helpers
- `@fluxdom/server` - server rendering utilities
- `@fluxdom/router` - routing primitives
- `@fluxdom/store` - state helpers
- `@fluxdom/vite-plugin` - Vite integration for `.flow` files
- `@fluxdom/cli` - prototype CLI commands

## Example Component

```html
<script>
  let count = 0;

  function increment() {
    count++;
  }
</script>

<template>
  <button @click="increment">Count: {count}</button>
</template>

<style scoped>
  button {
    padding: 0.75rem 1rem;
  }
</style>
```

## Project Status

FluxDOM is a prototype, not production framework code. It is valuable as a portfolio project because it shows compiler work, runtime design, monorepo structure, Vite plugin integration, and test/build discipline.

## Development

```bash
npm install
npm test
npm run build
```

## Recent Hardening

Generated artifacts were removed from source control, workspace builds were stabilized, and `{#if ...}{/if}` template blocks now compile correctly.

## License

MIT
