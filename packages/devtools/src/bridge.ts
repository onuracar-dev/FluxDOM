export function initBridge() {
  if (typeof window !== 'undefined') {
    window.postMessage({
      source: 'FluxDOM-devtools-bridge',
      type: 'INIT'
    }, '*');
    
    // Listen for real mount events from the runtime
    window.addEventListener('__FluxDOM_MOUNT__', (e: any) => {
      window.postMessage({
        source: 'FluxDOM-devtools-bridge',
        type: 'COMPONENT_MOUNTED',
        payload: { node: e.detail.node.tagName || 'Text' }
      }, '*');
    });

    // Listen for signal creation
    window.addEventListener('__FluxDOM_SIGNAL_CREATED__', () => {
      const win = window as any;
      const values = win.__FluxDOM_SIGNALS__?.map((s: any) => s.get()) || [];
      window.postMessage({
        source: 'FluxDOM-devtools-bridge',
        type: 'SIGNALS_UPDATED',
        payload: values
      }, '*');
    });

    // Handle DevTools requests
    window.addEventListener('message', (event) => {
      if (event.source !== window || event.data.source !== 'FluxDOM-devtools-panel') return;
      
      if (event.data.type === 'GET_DATA') {
        const win = window as any;
        window.postMessage({
          source: 'FluxDOM-devtools-bridge',
          type: 'SIGNALS_UPDATED',
          payload: win.__FluxDOM_SIGNALS__?.map((s: any) => s.get()) || []
        }, '*');
      }
    });
  }
}
