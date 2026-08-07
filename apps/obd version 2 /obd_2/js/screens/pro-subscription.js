import { setPro } from '../hooks/useAuthGuard.js';

export const proSubscriptionScreen = {
  render(container) {
    container.innerHTML = `
      <div style="max-width:400px;margin:80px auto;text-align:center;">
        <h1 class="font-display" style="font-size:24px;margin:0 0 4px;">Go Pro</h1>
        <p style="color:var(--text-dim);font-size:13px;margin:0 0 24px;">Unlock performance tuning, ECU flashing, and unlimited PDF exports.</p>
        <div class="card">
          <div class="font-data" style="font-size:36px;color:var(--cyan-primary);">R 549<span style="font-size:14px;color:var(--text-dim);">/mo</span></div>
          <button class="btn btn--solid" id="subscribe-btn" style="width:100%;margin-top:16px;">Subscribe</button>
        </div>
      </div>`;

    container.querySelector('#subscribe-btn').addEventListener('click', () => {
      setPro(true);
      location.hash = '#/payment-success';
    });
  },
  destroy() {},
};

export const paymentSuccessScreen = {
  render(container) {
    container.innerHTML = `
      <div style="max-width:400px;margin:100px auto;text-align:center;">
        <div style="font-size:48px;color:var(--cyan-primary);">✓</div>
        <h1 class="font-display" style="font-size:22px;">Payment Confirmed</h1>
        <p style="color:var(--text-dim);font-size:13px;">Pro features are now unlocked.</p>
        <a href="#/dashboard" class="btn btn--solid" style="display:inline-block;margin-top:16px;">Return to Dashboard</a>
      </div>`;
  },
  destroy() {},
};
