import { logout, getSession } from '../../hooks/useAuthGuard.js';

const POLL_KEY = 'cyberdiag.pollInterval';

export const systemSettingsScreen = {
  render(container) {
    const session = getSession();
    const pollInterval = localStorage.getItem(POLL_KEY) || '250';
    container.innerHTML = `
      <h1 class="font-display" style="font-size:28px;margin:0 0 16px;">System Settings</h1>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="card">
          <h2 class="font-display" style="font-size:14px;text-transform:uppercase;margin:0 0 12px;">Hardware</h2>
          <label style="display:block;font-size:12px;color:var(--text-dim);margin-bottom:6px;">Poll Interval (ms)</label>
          <input type="number" id="poll-input" min="10" max="1000" value="${pollInterval}"
            style="width:100%;padding:8px;background:var(--surface);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:var(--text-main);">
          <p style="font-size:11px;color:var(--text-dim);margin-top:8px;">Recommended range: 10–50ms for real-time sensors.</p>
        </div>
        <div class="card">
          <h2 class="font-display" style="font-size:14px;text-transform:uppercase;margin:0 0 12px;">Account</h2>
          <p style="font-size:13px;color:var(--text-main);">${session ? session.email : 'Not signed in'}</p>
          <button class="btn" id="logout-btn" style="margin-top:12px;">Sign out</button>
        </div>
      </div>`;

    container.querySelector('#poll-input').addEventListener('change', (e) => {
      localStorage.setItem(POLL_KEY, e.target.value);
    });
    container.querySelector('#logout-btn').addEventListener('click', () => {
      logout();
      location.hash = '#/auth';
    });
  },
  destroy() {},
};
