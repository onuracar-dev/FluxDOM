import { __trace } from '../demo/runtime-shim.js';
import { createSignal } from '../demo/runtime-shim.js';

  const [__count, __setCount] = createSignal(0);

import { addEventListener, createEffect, createElement, createText, insert, setAttribute, setText } from '../demo/runtime-shim.js';

export function render() {
  const __el0 = createElement("button");
  addEventListener(__el0, "click", () => __setCount(__count() + 1));
  createEffect(__trace(10, () => { setAttribute(__el0, "class", __count() > 5 ? 'max' : ''); }));
  const __text1 = createText(" Count: ");
  insert(__el0, __text1);
  const __expr2 = createText('');
  createEffect(__trace(14, () => { setText(__expr2, String(__count())); }));
  insert(__el0, __expr2);
  return __el0;
}
export const __flowStrategy = 'CSR';
