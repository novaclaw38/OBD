// Minimal hash-based SPA router. Registers routes as {path -> {render(container)}}.
export class Router {
  constructor(outlet, navSelector = '.app-nav a, .mobile-tabbar a') {
    this.outlet = outlet;
    this.navSelector = navSelector;
    this.routes = new Map();
    this.current = null;
    window.addEventListener('hashchange', () => this._resolve());
  }

  register(path, module) {
    this.routes.set(path, module);
    return this;
  }

  start(defaultPath) {
    if (!location.hash) location.hash = `#${defaultPath}`;
    this._resolve();
  }

  _resolve() {
    const path = location.hash.replace(/^#/, '') || '/';
    const module = this.routes.get(path);
    if (this.current?.destroy) this.current.destroy();
    document.querySelectorAll(this.navSelector).forEach((a) => {
      a.classList.toggle('active', a.getAttribute('data-path') === path);
    });
    if (!module) {
      this.outlet.innerHTML = `<div class="card">Route not found: ${path}</div>`;
      this.current = null;
      return;
    }
    this.current = module;
    module.render(this.outlet);
  }
}
