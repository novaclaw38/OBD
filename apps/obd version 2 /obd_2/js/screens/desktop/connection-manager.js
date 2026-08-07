import { hardwareLink } from '../../hooks/useHardwareLink.js';
import { Terminal } from '../../components/Terminal.js';

export const connectionManagerScreen = {
  render(container) {
    container.innerHTML = `
      <h1 class="font-display" style="font-size:28px;margin:0 0 16px;">Connection Manager</h1>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="card">
          <h2 class="font-display" style="font-size:14px;text-transform:uppercase;margin:0 0 12px;">Adapter</h2>
          <p style="font-size:13px;color:var(--text-dim);margin:0 0 12px;">
            ${hardwareLink.supported ? 'Web Bluetooth is available on this browser.' : 'Web Bluetooth is not available — running in simulated mode.'}
          </p>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <span class="pulse-dot"></span>
            <span id="state-label" style="text-transform:uppercase;font-size:12px;">${hardwareLink.state}</span>
          </div>
          <button class="btn btn--solid" id="scan-btn">Scan for Modules</button>
          <button class="btn" id="sim-btn" style="margin-left:8px;">Use Simulator</button>
          <button class="btn" id="disconnect-btn" style="margin-left:8px;">Disconnect</button>
          <div id="scan-error" style="color:var(--error);font-size:12px;margin-top:10px;"></div>
        </div>
        <div class="card">
          <h2 class="font-display" style="font-size:14px;text-transform:uppercase;margin:0 0 12px;">Protocol Log</h2>
          <div id="terminal"></div>
        </div>
      </div>`;

    this.terminal = new Terminal(container.querySelector('#terminal'));
    this._onState = (e) => {
      container.querySelector('#state-label').textContent = e.detail.state;
    };
    hardwareLink.addEventListener('statechange', this._onState);

    container.querySelector('#scan-btn').addEventListener('click', async () => {
      container.querySelector('#scan-error').textContent = '';
      try {
        await hardwareLink.connect();
      } catch (err) {
        container.querySelector('#scan-error').textContent = err.message;
      }
    });
    container.querySelector('#sim-btn').addEventListener('click', () => hardwareLink.simulate());
    container.querySelector('#disconnect-btn').addEventListener('click', () => hardwareLink.disconnect());
  },
  destroy() {
    hardwareLink.removeEventListener('statechange', this._onState);
    this.terminal?.destroy();
  },
};
