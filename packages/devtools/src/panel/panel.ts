declare var chrome: any;

chrome.devtools.panels.create(
  "FluxDOM",
  "",
  "panel/index.html",
  function(panel: any) {
    console.log("FluxDOM panel created");
    
    // Setup communication with the background/content script
    // For this prototype, we'll simulate the incoming messages
    // Normally this connects to chrome.runtime.connect()
    
    const root = document.getElementById('root');
    let components: string[] = [];
    let signals: any[] = [];
    
    function render() {
      if (!root) return;
      root.replaceChildren();

      const container = document.createElement('div');

      const compTitle = document.createElement('strong');
      compTitle.textContent = 'Active Components:';
      container.appendChild(compTitle);

      const compList = document.createElement('ul');
      compList.className = 'tree';
      if (components.length > 0) {
        for (const c of components) {
          const li = document.createElement('li');
          li.textContent = `<${c}> `;
          const badge = document.createElement('span');
          badge.style.color = '#a78bfa';
          badge.textContent = '[Mounted]';
          li.appendChild(badge);
          compList.appendChild(li);
        }
      } else {
        const li = document.createElement('li');
        li.textContent = 'Waiting for components...';
        compList.appendChild(li);
      }
      container.appendChild(compList);

      container.appendChild(document.createElement('br'));

      const sigTitle = document.createElement('strong');
      sigTitle.textContent = 'Active Signals (Raw Values):';
      container.appendChild(sigTitle);

      const sigList = document.createElement('ul');
      sigList.className = 'tree';
      if (signals.length > 0) {
        signals.forEach((s, i) => {
          const li = document.createElement('li');
          li.textContent = `Signal ${i}: ${JSON.stringify(s)}`;
          sigList.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.textContent = 'No signals found';
        sigList.appendChild(li);
      }
      container.appendChild(sigList);

      root.appendChild(container);
    }
    
    // Simulate receiving data from bridge.ts via chrome background
    // In reality: port.onMessage.addListener(...)
    window.addEventListener('message', (event) => {
      if (event.data.source === 'FluxDOM-devtools-bridge') {
        if (event.data.type === 'COMPONENT_MOUNTED') {
          components.push(event.data.payload.node);
          render();
        } else if (event.data.type === 'SIGNALS_UPDATED') {
          signals = event.data.payload;
          render();
        }
      }
    });
    
    // Request initial data
    window.postMessage({ source: 'FluxDOM-devtools-panel', type: 'GET_DATA' }, '*');
    render();
  }
);
