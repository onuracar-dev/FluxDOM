const trackedSignals: Array<{ get: () => any }> = [];

function setupHook(): void {
  const g = globalThis as any;
  if (!g.__FLUXDOM_DEVTOOLS_HOOK__) {
    g.__FLUXDOM_DEVTOOLS_HOOK__ = {
      onSignalCreated(signal: { get: () => any }) {
        trackedSignals.push(signal);
        if (typeof window !== 'undefined') {
          window.postMessage({
            source: 'FluxDOM-devtools-bridge',
            type: 'SIGNALS_UPDATED',
            payload: trackedSignals.map((s) => s.get()),
          }, '*');
        }
      },
    };
  }
}

// Define on globalThis before page loads
setupHook();

export function initBridge(): void {
  setupHook();
  if (typeof window !== 'undefined') {
    window.postMessage({
      source: 'FluxDOM-devtools-bridge',
      type: 'INIT',
    }, '*');

    // Listen for real mount events from the runtime
    window.addEventListener('__FluxDOM_MOUNT__', (e: any) => {
      window.postMessage({
        source: 'FluxDOM-devtools-bridge',
        type: 'COMPONENT_MOUNTED',
        payload: { node: e.detail.node.tagName || 'Text' },
      }, '*');
    });

    // Handle DevTools requests
    window.addEventListener('message', (event) => {
      if (event.source !== window || event.data?.source !== 'FluxDOM-devtools-panel') return;

      if (event.data.type === 'GET_DATA') {
        window.postMessage({
          source: 'FluxDOM-devtools-bridge',
          type: 'SIGNALS_UPDATED',
          payload: trackedSignals.map((s) => s.get()),
        }, '*');
      }
    });
  }
}
