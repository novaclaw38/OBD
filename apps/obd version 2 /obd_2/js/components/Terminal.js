// Scrolling hex log terminal — subscribes to hardwareLink tx/data events.
import { hardwareLink } from '../hooks/useHardwareLink.js';

export class Terminal {
  constructor(el, { maxLines = 200 } = {}) {
    this.el = el;
    this.maxLines = maxLines;
    this.el.classList.add('terminal');
    this._onTx = (e) => this._append('TX', e.detail.line);
    this._onData = (e) => this._append('RX', e.detail.line);
    hardwareLink.addEventListener('tx', this._onTx);
    hardwareLink.addEventListener('data', this._onData);
  }

  _append(dir, line) {
    const row = document.createElement('div');
    row.className = `terminal__line terminal__line--${dir.toLowerCase()}`;
    row.textContent = `> ${dir}: ${line}`;
    this.el.appendChild(row);
    while (this.el.children.length > this.maxLines) this.el.removeChild(this.el.firstChild);
    this.el.scrollTop = this.el.scrollHeight;
  }

  destroy() {
    hardwareLink.removeEventListener('tx', this._onTx);
    hardwareLink.removeEventListener('data', this._onData);
  }
}
