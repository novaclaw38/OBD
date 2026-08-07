import { useOBDPoll } from '../../hooks/useOBDPoll.js';
import { Gauge } from '../../components/Gauge.js';
import { renderLinkGate } from '../../lib/linkGate.js';

const SENSORS = [
  { pid: '0104', label: 'Load', min: 0, max: 100 },
  { pid: '0111', label: 'Throttle', min: 0, max: 100 },
  { pid: '010B', label: 'MAP', min: 0, max: 255 },
  { pid: '012F', label: 'Fuel Level', min: 0, max: 100 },
];

export const pocketSensorsScreen = {
  render(container) {
    this._closeGate = renderLinkGate(container, () => this._renderData(container));
  },

  _renderData(container) {
    container.innerHTML = `
      <h1 class="font-display" style="font-size:20px;margin:0 0 16px;">Pocket Sensors</h1>
      <div id="grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"></div>`;

    const grid = container.querySelector('#grid');
    this.gauges = {};
    SENSORS.forEach((s) => {
      const cell = document.createElement('div');
      cell.className = 'card';
      grid.appendChild(cell);
      this.gauges[s.pid] = new Gauge(cell, { type: 'linear', min: s.min, max: s.max, label: s.label });
    });

    this.poll = useOBDPoll(SENSORS.map((s) => s.pid), (pid, reading) => {
      this.gauges[pid]?.set(reading.value);
    }, 300);
    this.poll.start();
  },

  destroy() {
    this.poll?.stop();
    this._closeGate?.();
  },
};
