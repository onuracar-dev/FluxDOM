# FluxDOM

Experimental `.flow` component compiler and fine-grained DOM runtime.

<img src="./docs/assets/preview.svg" alt="FluxDOM architecture preview">

FluxDOM explores what a frontend framework can look like when a compiler does more of the work: parse a single-file component, analyze its behavior, infer a rendering strategy, and generate direct DOM operations instead of diffing a Virtual DOM tree.

## What It Demonstrates

- Compiler pipeline design for a custom component format
- Fine-grained signal runtime and effect tracking
- Direct DOM generation from templates
- Conditional block support with `{#if ...}{/if}`
- Vite plugin integration for `.flow` files
- TypeScript project references inside a monorepo
- Generated artifact cleanup and reproducible build setup

## Monorepo Map

| Package | Purpose |
| --- | --- |
| `@fluxdom/compiler` | Parses, analyzes, and transforms `.flow` files |
| `@fluxdom/runtime` | Signals, effects, DOM helpers, and hydration helpers |
| `@fluxdom/server` | Server rendering utilities |
| `@fluxdom/router` | Routing primitives |
| `@fluxdom/store` | Store helpers built around the runtime |
| `@fluxdom/vite-plugin` | Vite integration for `.flow` modules |
| `@fluxdom/cli` | Prototype command-line surface |

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

## Build Flow

```text
.flow file
  -> parser
  -> static analyzer
  -> script/template/style transforms
  -> direct DOM runtime calls
  -> Vite application bundle
```

## Development

```bash
npm install
npm test
npm run build
```

## Current Status

FluxDOM is a prototype, not production framework code. Its value is in the engineering surface: compiler work, runtime design, package boundaries, build orchestration, and framework-level thinking.

## Recent Hardening

- Removed generated `.js`, `.d.ts`, `dist`, cache, and nested dependency artifacts from source control
- Stabilized root test config so Vitest runs TypeScript source tests in `jsdom`
- Fixed monorepo build sequencing with TypeScript project references
- Added support for `{#if ...}{/if}` template blocks

## Roadmap

- Expand parser coverage for loops and nested directives
- Add compiler fixture tests
- Improve scoped CSS handling
- Add a small interactive docs/demo page
- Publish package-level API documentation

## Author

Onur Acar - <https://github.com/onuracar-dev>
