// Reusable gauge component: radial (SVG ring), linear (bar), or digital (numeric readout).
export class Gauge {
  /**
   * @param {HTMLElement} el - mount point
   * @param {{type: 'radial'|'linear'|'digital', min?: number, max?: number, unit?: string, label?: string, color?: string}} opts
   */
  constructor(el, opts) {
    this.el = el;
    this.opts = { min: 0, max: 100, unit: '', label: '', color: 'var(--cyan-primary)', ...opts };
    this.value = this.opts.min;
    this._render();
  }

  _render() {
    const { type, label } = this.opts;
    this.el.classList.add('gauge', `gauge--${type}`);
    if (type === 'radial') {
      this.el.innerHTML = `
        <svg viewBox="0 0 120 120" class="gauge__ring">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10"/>
          <circle cx="60" cy="60" r="52" fill="none" stroke="${this.opts.color}" stroke-width="10"
            stroke-linecap="round" stroke-dasharray="${2 * Math.PI * 52}" stroke-dashoffset="${2 * Math.PI * 52}"
            transform="rotate(-90 60 60)" class="gauge__value-ring"/>
        </svg>
        <div class="gauge__center">
          <span class="gauge__number font-data">0</span>
          <span class="gauge__unit">${this.opts.unit}</span>
        </div>
        <div class="gauge__label">${label}</div>`;
      this.ring = this.el.querySelector('.gauge__value-ring');
      this.number = this.el.querySelector('.gauge__number');
    } else if (type === 'linear') {
      this.el.innerHTML = `
        <div class="gauge__label">${label}</div>
        <div class="gauge__track"><div class="gauge__fill" style="background:${this.opts.color}"></div></div>
        <div class="gauge__readout font-data">0 ${this.opts.unit}</div>`;
      this.fill = this.el.querySelector('.gauge__fill');
      this.readout = this.el.querySelector('.gauge__readout');
    } else {
      this.el.innerHTML = `
        <div class="gauge__label">${label}</div>
        <div class="gauge__digital font-data" style="color:${this.opts.color}">0<span class="gauge__unit">${this.opts.unit}</span></div>`;
      this.digital = this.el.querySelector('.gauge__digital');
    }
  }

  set(value) {
    const { min, max, type, unit } = this.opts;
    this.value = value;
    const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
    if (type === 'radial') {
      const circumference = 2 * Math.PI * 52;
      this.ring.style.strokeDashoffset = String(circumference * (1 - pct));
      this.number.textContent = Math.round(value);
    } else if (type === 'linear') {
      this.fill.style.width = `${pct * 100}%`;
      this.readout.textContent = `${Math.round(value * 100) / 100} ${unit}`;
    } else {
      this.digital.firstChild.textContent = Math.round(value * 100) / 100;
    }
  }
}
