// PDF export: renders a print-friendly report and hands off to the browser's
// native print-to-PDF (window.print), avoiding a heavy PDF-generation dependency.

export const pdfExportScreen = {
  render(container) {
    const now = new Date();
    container.innerHTML = `
      <h1 class="font-display" style="font-size:20px;margin:0 0 16px;">Workshop Report</h1>
      <div class="card" id="report">
        <h2 class="font-display" style="margin:0 0 4px;">Diagnostic Summary</h2>
        <p style="font-size:11px;color:var(--text-dim);margin:0 0 16px;">Generated ${now.toLocaleString()}</p>
        <table style="width:100%;font-size:12px;border-collapse:collapse;">
          <tr><td style="padding:4px 0;color:var(--text-dim);">Vehicle</td><td>—</td></tr>
          <tr><td style="padding:4px 0;color:var(--text-dim);">Fault Codes</td><td>P0300, P0171, U0100</td></tr>
          <tr><td style="padding:4px 0;color:var(--text-dim);">Coolant Temp</td><td>92°C</td></tr>
          <tr><td style="padding:4px 0;color:var(--text-dim);">Battery Voltage</td><td>14.2V</td></tr>
        </table>
      </div>
      <button class="btn btn--solid" id="export-btn" style="width:100%;margin-top:16px;">Export as PDF</button>
      <style>
        @media print {
          body * { visibility: hidden; }
          #report, #report * { visibility: visible; }
          #report { position: absolute; top: 0; left: 0; width: 100%; }
        }
      </style>`;

    container.querySelector('#export-btn').addEventListener('click', () => window.print());
  },
  destroy() {},
};
