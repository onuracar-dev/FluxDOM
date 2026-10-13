import { describe, expect, it, vi } from 'vitest';
import { initBridge } from './bridge.js';

describe('Devtools bridge', () => {
  it('installs __FLUXDOM_DEVTOOLS_HOOK__ on globalThis', () => {
    initBridge();
    expect((globalThis as any).__FLUXDOM_DEVTOOLS_HOOK__).toBeDefined();
    expect(typeof (globalThis as any).__FLUXDOM_DEVTOOLS_HOOK__.onSignalCreated).toBe('function');
  });

  it('notifies window of signals through postMessage', () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage');
    initBridge();
    const hook = (globalThis as any).__FLUXDOM_DEVTOOLS_HOOK__;
    hook.onSignalCreated({ get: () => 42 });

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'FluxDOM-devtools-bridge',
        type: 'SIGNALS_UPDATED',
        payload: expect.arrayContaining([42]),
      }),
      '*',
    );
    postMessageSpy.mockRestore();
  });
});
