"use strict";
chrome.devtools.panels.create("FluxDOM", "", "panel/index.html", function (panel) {
    console.log("FluxDOM panel created");
    // Setup communication with the background/content script
    // For this prototype, we'll simulate the incoming messages
    // Normally this connects to chrome.runtime.connect()
    const root = document.getElementById('root');
    let components = [];
    let signals = [];
    function render() {
        if (!root)
            return;
        root.innerHTML = `
        <div>
          <strong>Active Components:</strong>
          <ul class="tree">
            ${components.length ? components.map(c => `<li>&lt;${c}&gt; <span style="color:#a78bfa">[Mounted]</span></li>`).join('') : '<li>Waiting for components...</li>'}
          </ul>
          <br/>
          <strong>Active Signals (Raw Values):</strong>
          <ul class="tree">
            ${signals.length ? signals.map((s, i) => `<li>Signal ${i}: ${JSON.stringify(s)}</li>`).join('') : '<li>No signals found</li>'}
          </ul>
        </div>
      `;
    }
    // Simulate receiving data from bridge.ts via chrome background
    // In reality: port.onMessage.addListener(...)
    window.addEventListener('message', (event) => {
        if (event.data.source === 'FluxDOM-devtools-bridge') {
            if (event.data.type === 'COMPONENT_MOUNTED') {
                components.push(event.data.payload.node);
                render();
            }
            else if (event.data.type === 'SIGNALS_UPDATED') {
                signals = event.data.payload;
                render();
            }
        }
    });
    // Request initial data
    window.postMessage({ source: 'FluxDOM-devtools-panel', type: 'GET_DATA' }, '*');
    render();
});
//# sourceMappingURL=panel.js.map