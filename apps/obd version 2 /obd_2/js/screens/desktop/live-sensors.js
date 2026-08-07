import { useOBDPoll } from '../../hooks/useOBDPoll.js';
import { Gauge } from '../../components/Gauge.js';
import { Terminal } from '../../components/Terminal.js';
import { renderLinkGate } from '../../lib/linkGate.js';

const SENSORS = [
  { pid: '010C', label: 'Engine RPM', type: 'radial', min: 0, max: 7000 },
  { pid: '010D', label: 'Vehicle Speed', type: 'radial', min: 0, max: 240 },
  { pid: '0105', label: 'Coolant Temp', type: 'linear', min: -40, max: 130 },
  { pid: '010F', label: 'Intake Air Temp', type: 'linear', min: -40, max: 100 },
  { pid: '0111', label: 'Throttle Position', type: 'linear', min: 0, max: 100 },
  { pid: '0114', label: 'O2 Sensor B1S1', type: 'digital', min: 0, max: 1.2 },
  { pid: '0110', label: 'MAF Air Flow', type: 'digital', min: 0, max: 200 },
  { pid: '0142', label: 'Control Mod Volts', type: 'digital', min: 8, max: 16 },
];

export const liveSensorsScreen = {
  render(container) {
    this._closeGate = renderLinkGate(container, () => this._renderData(container));
  },

  _renderData(container) {
    container.innerHTML = `
      <h1 class="font-display" style="font-size:28px;margin:0 0 16px;">Live Sensors</h1>
      <div id="grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px;"></div>
      <div class="card">
        <h2 class="font-display" style="font-size:14px;text-transform:uppercase;margin:0 0 8px;">Raw Bus Stream</h2>
        <div id="terminal"></div>
      </div>`;

    const grid = container.querySelector('#grid');
    this.gauges = {};
    SENSORS.forEach((s) => {
      const cell = document.createElement('div');
      cell.className = 'card';
      grid.appendChild(cell);
      this.gauges[s.pid] = new Gauge(cell, { type: s.type, min: s.min, max: s.max, label: s.label });
    });

    this.terminal = new Terminal(container.querySelector('#terminal'));

    this.poll = useOBDPoll(SENSORS.map((s) => s.pid), (pid, reading) => {
      this.gauges[pid]?.set(reading.value);
    }, 200);
    this.poll.start();
  },

  destroy() {
    this.poll?.stop();
    this.terminal?.destroy();
    this._closeGate?.();
  },
};
