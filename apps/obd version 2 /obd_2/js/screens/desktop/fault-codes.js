import { decodeDTC } from '../../lib/pids.js';

// Raw fault byte pairs, as would come back from Mode 03 (request stored DTCs).
const RAW_DTC_BYTES = [
  { bytes: [0x03, 0x00], severity: 'critical', desc: 'Random/Multiple Cylinder Misfire Detected', module: 'ENG_CTRL_MOD' },
  { bytes: [0x01, 0x71], severity: 'pending', desc: 'System Too Lean (Bank 1)', module: 'FUEL_SYS' },
  { bytes: [0xc1, 0x00], severity: 'history', desc: 'Lost Comm with ECM/PCM A', module: 'CAN_BUS' },
];

export const faultCodesScreen = {
  render(container) {
    const dtcs = RAW_DTC_BYTES.map((r) => ({ code: decodeDTC(r.bytes[0], r.bytes[1]), ...r }));
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h1 class="font-display" style="font-size:28px;margin:0;">Fault Codes</h1>
        <div style="display:flex;gap:8px;">
          <button class="btn" id="rescan">Rescan</button>
          <button class="btn btn--solid" id="clear">Clear Codes</button>
        </div>
      </div>
      <div class="card">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="text-align:left;color:var(--text-dim);font-size:11px;text-transform:uppercase;">
              <th style="padding:8px;">Code</th><th>Description</th><th>Module</th><th>Severity</th>
            </tr>
          </thead>
          <tbody id="dtc-rows"></tbody>
        </table>
      </div>`;

    const renderRows = (rows) => {
      container.querySelector('#dtc-rows').innerHTML = rows.length
        ? rows.map((d) => `
            <tr style="border-top:1px solid rgba(255,255,255,0.06);">
              <td style="padding:10px 8px;" class="font-data severity-${d.severity}">${d.code}</td>
              <td style="color:var(--text-main);">${d.desc}</td>
              <td style="color:var(--text-dim);font-size:12px;">${d.module}</td>
              <td class="severity-${d.severity}" style="text-transform:uppercase;font-size:11px;">${d.severity}</td>
            </tr>`).join('')
        : `<tr><td colspan="4" style="padding:24px;text-align:center;color:var(--text-dim);">No fault codes stored</td></tr>`;
    };
    renderRows(dtcs);

    container.querySelector('#clear').addEventListener('click', () => renderRows([]));
    container.querySelector('#rescan').addEventListener('click', () => renderRows(dtcs));
  },
  destroy() {},
};
