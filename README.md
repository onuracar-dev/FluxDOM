# FluxDOM

**Write components. Ship direct DOM.**

FluxDOM is an experimental compiler for single-file `.flow` components, paired with a small fine-grained DOM runtime. The compiler turns your template into plain DOM calls. At runtime, signals update only the nodes that read them. There is no virtual DOM and no diffing.

[Live site and demo](https://fluxdom.onuracar.dev/) · [Compiler source](./packages/compiler/src) · [Known limitations](#what-works-and-what-doesnt)

> **Status:** pre-1.0 learning project. It is built to be read and understood, not to run your checkout page. Syntax, output and APIs can change.

---

## The idea in one example

You write this:

```html
<script lang="ts">
  let count = 0;
</script>

<template>
  <button :class="count > 5 ? 'max' : ''" @click="() => count++">
    Count: {count}
  </button>
</template>
```

The compiler produces this (real output, whitespace trimmed):

```js
import { createSignal } from '@fluxdom/runtime';
import { addEventListener, createEffect, createElement, createText, insert, setAttribute, setText } from '@fluxdom/runtime';

const [__count, __setCount] = createSignal(0);

export function render() {
  const __el0 = createElement("button");
  addEventListener(__el0, "click", () => __setCount(__count() + 1));
  createEffect(() => { setAttribute(__el0, "class", __count() > 5 ? 'max' : ''); });
  const __text1 = createText(" Count: ");
  insert(__el0, __text1);
  const __expr2 = createText('');
  createEffect(() => { setText(__expr2, String(__count())); });
  insert(__el0, __expr2);
  return __el0;
}
```

Three things happened:

1. **`let count = 0` became a signal.** Every top-level `let` in `<script>` turns into a `createSignal` pair. Reads become `__count()`, writes become `__setCount(...)`.
2. **Each dynamic part got its own effect.** The text node and the `class` attribute each subscribe only to the signals they read.
3. **Clicking writes one text node.** There is no re-render and no tree comparison. The effect that owns `__expr2` runs and calls `setText`. You can watch this happen, line by line, in the [live demo](https://fluxdom.onuracar.dev/#demo).

## How the compiler works

```text
App.flow
  │
  ├─ 1. Parse       split <script>, <template>, <style>; build a template AST
  ├─ 2. Analyze     find signals (top-level let), pick a render strategy
  ├─ 3. Transform   script → signals, template → DOM calls, style → scoped CSS
  ├─ 4. Emit        render() function + virtual CSS module
  └─ 5. Bundle      the Vite plugin hands both to Vite
```

| Stage | Where to read it |
| --- | --- |
| Parse | [`compiler/src/parser`](./packages/compiler/src/parser/index.ts) |
| Analyze | [`compiler/src/analyzer`](./packages/compiler/src/analyzer/index.ts) |
| Script transform | [`transformer/ast-rewriter.ts`](./packages/compiler/src/transformer/ast-rewriter.ts) |
| Template transform | [`transformer/template-transform.ts`](./packages/compiler/src/transformer/template-transform.ts) |
| Scoped styles | [`transformer/style-transform.ts`](./packages/compiler/src/transformer/style-transform.ts) |
| Signals and effects | [`runtime/src/reactivity`](./packages/runtime/src/reactivity) |

The script transform uses a real JavaScript/TypeScript AST (`@babel/parser`) with scope tracking. A `count` parameter inside a function is a different variable from the top-level `count` signal, and the compiler knows that. When it can't handle something, it fails with a clear error instead of emitting broken JavaScript.

## Packages

| Package | What it does |
| --- | --- |
| [`@fluxdom/compiler`](./packages/compiler) | `.flow` parser, analysis and code generation |
| [`@fluxdom/runtime`](./packages/runtime) | Signals, effects, lazy computed values, batching, DOM helpers |
| [`@fluxdom/vite-plugin`](./packages/vite-plugin) | Compiles `.flow` imports and bundles their CSS |
| [`@fluxdom/cli`](./packages/cli) | `create` scaffold plus `dev` / `build` wrappers |
| [`@fluxdom/store`](./packages/store) | Signal-backed stores with optional browser persistence |
| [`@fluxdom/router`](./packages/router) | Route matching and navigation signals |
| [`@fluxdom/server`](./packages/server) | Escaped static HTML rendering, never evaluates component code |

The packages are published on npm as `0.1.0`. That release predates the AST-based compiler and the runtime fixes, so **use the repository for the current behavior** until the next release.

## Try it

From the repository:

```bash
git clone https://github.com/onuracar-dev/FluxDOM.git
cd FluxDOM
npm ci
npm run check                          # build every package and run the tests
npm run dev --workspace hello-world    # http://localhost:5180
```

Using a component in your own entry file:

```ts
import { render } from './App.flow';
import { insert } from '@fluxdom/runtime';

insert(document.getElementById('app')!, render());
```

Scaffold a new project (uses the published `0.1.0` packages):

```bash
npx @fluxdom/cli create my-flow-app
cd my-flow-app && npm install && npm run dev
```

## Template syntax

| Syntax | Meaning |
| --- | --- |
| `{expr}` | Text that updates when the signals in `expr` change |
| `:attr="expr"` | Reactive attribute |
| `@event="handler"` | Event listener |
| `{#if cond} … {/if}` | Conditional block |
| `{#each list as item, index} … {/each}` | List block |
| `<style scoped>` | CSS scoped to this component |

## What works, and what doesn't

**Works today**

- AST-based script transform with scope tracking, covered by edge-case tests.
- Nested `{#if}` / `{#each}`, reactive attributes, events and expressions.
- Scoped styles bundled through Vite.
- Signals, effects, batching, and lazy computed values without diamond-dependency glitches.
- Static SSR that escapes output and refuses to evaluate component code.

**Not yet**

- Keyed lists. `{#each}` rerenders its whole block when the list changes.
- Structural `{#if}`. It hides content with a display wrapper instead of unmounting it.
- Real hydration and full SSR. Hydration currently rerenders on the client.
- Destructuring in a top-level `let`, exporting signals, and destructuring assignment to signals. These fail with a compiler error that says what to write instead.
- In `x++` used inside a larger expression, the prefix/postfix return value difference is not preserved.
- Router mounting, nested routes, lifecycle hooks, source maps, and fine-grained HMR.

Don't compile `.flow` files you don't trust. See [SECURITY.md](./SECURITY.md).

## Repository layout

```text
packages/       compiler, runtime, vite-plugin, cli, store, router, server, devtools (private)
examples/       hello-world app
apps/docs/      minimal docs app built with FluxDOM
website/        fluxdom.onuracar.dev (React shell, demos run on the FluxDOM runtime)
docs/adr/       design decisions
```

## Design notes

- FluxDOM and its sibling project NimbleJS are versioned independently on purpose. See [ADR 0001](./docs/adr/0001-fluxdom-and-nimblejs-boundary.md).
- The website's demos run on FluxDOM's own runtime. The page shell is React, because FluxDOM's router and SSR aren't ready yet.

## Contributing

Issues and small pull requests are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) first, and run `npm run check` before you open a PR.

## License

[MIT](./LICENSE) © Onur Acar
