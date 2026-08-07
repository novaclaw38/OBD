import { login } from '../hooks/useAuthGuard.js';

export const authScreen = {
  render(container) {
    container.innerHTML = `
      <div style="max-width:360px;margin:80px auto;text-align:center;">
        <div class="app-brand__icon" style="margin:0 auto 16px;">⌁</div>
        <h1 class="font-display" style="font-size:24px;margin:0 0 4px;">CyberDiagnostic</h1>
        <p style="color:var(--text-dim);font-size:12px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 24px;">Technician sign in</p>
        <form id="login-form" class="card" style="text-align:left;">
          <label style="display:block;font-size:12px;color:var(--text-dim);margin-bottom:6px;">Email</label>
          <input required type="email" id="email" placeholder="you@workshop.com"
            style="width:100%;padding:10px;margin-bottom:16px;background:var(--surface);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:var(--text-main);">
          <button type="submit" class="btn btn--solid" style="width:100%;">Sign in</button>
        </form>
      </div>`;

    container.querySelector('#login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = container.querySelector('#email').value;
      login(email);
      location.hash = '#/dashboard';
    });
  },
  destroy() {},
};
