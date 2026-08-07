import { hardwareLink } from '../hooks/useHardwareLink.js';

/**
 * Renders a "not connected" prompt into `container` when no hardware link is active,
 * offering either a real Web Bluetooth scan or the offline simulator. Calls `onReady()`
 * once a link is established (real or simulated) and lets the caller render its own UI.
 * Returns a cleanup function.
 */
export function renderLinkGate(container, onReady) {
  function showPrompt(errorMessage) {
    container.innerHTML = `
      <div class="card" style="max-width:420px;margin:60px auto;text-align:center;">
        <h2 class="font-display" style="margin:0 0 8px;">No Hardware Link</h2>
        <p style="font-size:12px;color:var(--text-dim);margin:0 0 16px;">
          Connect an OBD-II adapter to see live data.
          ${errorMessage ? `<br><span style="color:var(--error);">${errorMessage}</span>` : ''}
        </p>
        <div style="display:flex;gap:8px;justify-content:center;">
          <button class="btn btn--solid" id="lg-scan">Scan for Adapter</button>
          <button class="btn" id="lg-sim">Use Simulator</button>
        </div>
      </div>`;
    container.querySelector('#lg-scan').addEventListener('click', async () => {
      try {
        await hardwareLink.connect();
      } catch (err) {
        showPrompt(err.message);
      }
    });
    container.querySelector('#lg-sim').addEventListener('click', () => hardwareLink.simulate());
  }

  const onState = (e) => {
    if (e.detail.state === 'connected') onReady();
    else if (e.detail.state === 'disconnected' || e.detail.state === 'error') showPrompt();
  };
  hardwareLink.addEventListener('statechange', onState);

  if (hardwareLink.state === 'connected') onReady();
  else showPrompt();

  return () => hardwareLink.removeEventListener('statechange', onState);
}
