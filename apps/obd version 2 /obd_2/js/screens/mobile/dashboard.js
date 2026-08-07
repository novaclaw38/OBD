import { useOBDPoll } from '../../hooks/useOBDPoll.js';
import { Gauge } from '../../components/Gauge.js';
import { renderLinkGate } from '../../lib/linkGate.js';

export const mobileDashboardScreen = {
  render(container) {
    this._closeGate = renderLinkGate(container, () => this._renderData(container));
  },

  _renderData(container) {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h1 class="font-display" style="font-size:20px;margin:0;">Roadside Triage</h1>
        <span class="pulse-dot"></span>
      </div>
      <div class="card" style="display:flex;justify-content:center;margin-bottom:12px;">
        <div id="rpm-gauge"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="card"><div id="speed-gauge"></div></div>
        <div class="card"><div id="temp-gauge"></div></div>
      </div>`;

    this.rpmGauge = new Gauge(container.querySelector('#rpm-gauge'), { type: 'radial', min: 0, max: 7000, unit: 'RPM' });
    this.speedGauge = new Gauge(container.querySelector('#speed-gauge'), { type: 'digital', unit: 'km/h', label: 'Speed', color: 'var(--secondary)' });
    this.tempGauge = new Gauge(container.querySelector('#temp-gauge'), { type: 'linear', min: -40, max: 130, unit: '°C', label: 'Coolant' });

    this.poll = useOBDPoll(['010C', '010D', '0105'], (pid, reading) => {
      if (pid === '010C') this.rpmGauge.set(reading.value);
      if (pid === '010D') this.speedGauge.set(reading.value);
      if (pid === '0105') this.tempGauge.set(reading.value);
    }, 300);
    this.poll.start();
  },

  destroy() {
    this.poll?.stop();
    this._closeGate?.();
  },
};
