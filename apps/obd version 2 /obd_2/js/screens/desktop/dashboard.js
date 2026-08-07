import { hardwareLink } from '../../hooks/useHardwareLink.js';
import { useOBDPoll } from '../../hooks/useOBDPoll.js';
import { Gauge } from '../../components/Gauge.js';
import { renderLinkGate } from '../../lib/linkGate.js';

const MOCK_DTCS = [
  { code: 'P0300', desc: 'Random/Multiple Cylinder Misfire Detected', module: 'ENG_CTRL_MOD', severity: 'critical' },
  { code: 'P0171', desc: 'System Too Lean (Bank 1)', module: 'FUEL_SYS', severity: 'pending' },
  { code: 'U0100', desc: 'Lost Comm with ECM/PCM A', module: 'CAN_BUS', severity: 'history' },
];

export const dashboardScreen = {
  render(container) {
    this._closeGate = renderLinkGate(container, () => this._renderData(container));
  },

  _renderData(container) {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px;">
        <div>
          <h1 class="font-display" style="font-size:32px;margin:0;">System Overview</h1>
          <p style="color:var(--text-dim);text-transform:uppercase;letter-spacing:0.08em;margin:4px 0 0;">OBD-II Telemetry Core</p>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:10px;padding:8px 16px;">
          <span class="pulse-dot"></span>
          <span style="text-transform:uppercase;font-size:11px;letter-spacing:0.08em;">${hardwareLink.simulated ? 'simulated' : 'connected'}</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 2fr 1fr;gap:16px;">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <h2 class="font-display" style="font-size:16px;margin:0;text-transform:uppercase;">Active Faults</h2>
            <span style="background:var(--error-container);color:var(--error);font-size:11px;padding:2px 8px;border-radius:4px;">${MOCK_DTCS.length} DETECTED</span>
          </div>
          <div id="dtc-list" style="display:flex;flex-direction:column;gap:8px;"></div>
        </div>
        <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;">
          <div id="rpm-gauge"></div>
          <div style="display:flex;gap:24px;">
            <div id="speed-gauge" style="width:80px;"></div>
            <div id="load-gauge" style="width:80px;"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="card"><div id="temp-gauge"></div></div>
          <div class="card"><div id="volts-gauge"></div></div>
        </div>
      </div>`;

    container.querySelector('#dtc-list').innerHTML = MOCK_DTCS.map((d) => `
      <div class="dtc-card severity-${d.severity}">
        <div style="display:flex;justify-content:space-between;">
          <span class="font-data" style="font-size:18px;">${d.code}</span>
        </div>
        <p style="font-size:12px;color:var(--text-dim);margin:6px 0;">${d.desc}</p>
        <div style="display:flex;justify-content:space-between;font-size:10px;">
          <span style="opacity:0.6;">${d.module}</span><span class="severity-${d.severity}">${d.severity.toUpperCase()}</span>
        </div>
      </div>`).join('');

    this.rpmGauge = new Gauge(container.querySelector('#rpm-gauge'), { type: 'radial', min: 0, max: 7000, unit: 'RPM' });
    this.speedGauge = new Gauge(container.querySelector('#speed-gauge'), { type: 'digital', unit: 'km/h', label: 'Speed', color: 'var(--secondary)' });
    this.loadGauge = new Gauge(container.querySelector('#load-gauge'), { type: 'digital', unit: '%', label: 'Load', color: 'var(--secondary)' });
    this.tempGauge = new Gauge(container.querySelector('#temp-gauge'), { type: 'linear', min: -40, max: 120, unit: '°C', label: 'Intake Air Temp' });
    this.voltsGauge = new Gauge(container.querySelector('#volts-gauge'), { type: 'linear', min: 8, max: 16, unit: 'V', label: 'Control Mod Volts', color: 'var(--cyan-primary)' });

    this.poll = useOBDPoll(['010C', '010D', '0104', '010F', '0142'], (pid, reading) => {
      if (pid === '010C') this.rpmGauge.set(reading.value);
      if (pid === '010D') this.speedGauge.set(reading.value);
      if (pid === '0104') this.loadGauge.set(reading.value);
      if (pid === '010F') this.tempGauge.set(reading.value);
      if (pid === '0142') this.voltsGauge.set(reading.value);
    }, 300);
    this.poll.start();
  },

  destroy() {
    this.poll?.stop();
    this._closeGate?.();
  },
};
