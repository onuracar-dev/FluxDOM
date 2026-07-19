# @fluxdom/compiler

Experimental parser, analyzer, and code generator for FluxDOM `.flow` files.
It currently supports elements, static and reactive attributes, events,
expressions, nested `{#if}` blocks, and `{#each}` blocks. It is pre-1.0 and its
script transform intentionally supports only a small JavaScript subset.

```ts
import { compileSource, parse } from '@fluxdom/compiler';

const result = compileSource(source, 'App.flow');
```

Do not compile untrusted source and execute the resulting module. See the
[FluxDOM repository](https://github.com/onuracar-dev/FluxDOM) for examples and
current limitations.
