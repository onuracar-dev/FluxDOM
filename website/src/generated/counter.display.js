import { createSignal } from '@fluxdom/runtime';

  const [__count, __setCount] = createSignal(0);

import { addEventListener, createEffect, createElement, createText, insert, setAttribute, setText } from '@fluxdom/runtime';

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
export const __flowStrategy = 'CSR';
