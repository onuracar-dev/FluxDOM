# @fluxdom/runtime

Fine-grained signals and direct DOM operations used by generated FluxDOM code.
The public surface includes `createSignal`, `createComputed`, `createEffect`,
`batch`, and low-level DOM helpers. This package is experimental and its API is
not yet stable.

```ts
import { createEffect, createSignal } from '@fluxdom/runtime';

const [count, setCount] = createSignal(0);
const stop = createEffect(() => console.log(count()));
setCount(1);
stop();
```
