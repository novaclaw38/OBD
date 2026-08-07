// Performance Tuning: Three.js 3D viewer + calibration sliders (Boost / Timing / Fuel).
// Actual ECU write is gated behind explicit "Flash" confirmation — never auto-sent.

const CALIBRATION_KEY = 'cyberdiag.calibration';

function loadCalibration() {
  try {
    return JSON.parse(localStorage.getItem(CALIBRATION_KEY)) || { boost: 0, timing: 0, fuel: 0 };
  } catch {
    return { boost: 0, timing: 0, fuel: 0 };
  }
}

export const performanceScreen = {
  async render(container) {
    container.innerHTML = `
      <h1 class="font-display" style="font-size:28px;margin:0 0 16px;">Performance Tuning</h1>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;">
        <div class="card" style="min-height:420px;position:relative;">
          <canvas id="viewer" style="width:100%;height:400px;display:block;"></canvas>
          <div id="viewer-fallback" style="display:none;position:absolute;inset:16px;align-items:center;justify-content:center;color:var(--text-dim);">
            3D viewer unavailable offline — Three.js failed to load.
          </div>
        </div>
        <div class="card">
          <h2 class="font-display" style="font-size:14px;text-transform:uppercase;margin:0 0 16px;">Calibration</h2>
          ${['boost', 'timing', 'fuel'].map((k) => `
            <div style="margin-bottom:16px;">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
                <span style="text-transform:uppercase;color:var(--text-dim);">${k}</span>
                <span class="font-data" id="${k}-val">0</span>
              </div>
              <input type="range" id="${k}-slider" min="-20" max="20" value="0" style="width:100%;">
            </div>`).join('')}
          <button class="btn btn--solid" id="flash-btn" style="width:100%;margin-top:8px;">Flash ECU</button>
          <div id="flash-status" style="margin-top:10px;font-size:12px;color:var(--text-dim);"></div>
        </div>
      </div>`;

    const state = loadCalibration();
    ['boost', 'timing', 'fuel'].forEach((k) => {
      const slider = container.querySelector(`#${k}-slider`);
      const val = container.querySelector(`#${k}-val`);
      slider.value = state[k];
      val.textContent = state[k];
      slider.addEventListener('input', () => {
        state[k] = Number(slider.value);
        val.textContent = state[k];
        localStorage.setItem(CALIBRATION_KEY, JSON.stringify(state));
      });
    });

    container.querySelector('#flash-btn').addEventListener('click', async () => {
      const status = container.querySelector('#flash-status');
      status.textContent = 'Flashing… 0%';
      for (let pct = 0; pct <= 100; pct += 20) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 150));
        status.textContent = `Flashing… ${pct}%`;
      }
      status.textContent = 'Flash complete.';
    });

    this._initViewer(container);
  },

  async _initViewer(container) {
    const canvas = container.querySelector('#viewer');
    try {
      const THREE = await import('three');
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / 400, 0.1, 100);
      camera.position.set(0, 1, 4);

      const geo = new THREE.TorusKnotGeometry(0.8, 0.25, 128, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0x00ffff, metalness: 0.6, roughness: 0.2, emissive: 0x003333 });
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
      scene.add(new THREE.AmbientLight(0x404040, 2));
      const point = new THREE.PointLight(0x00ffff, 30);
      point.position.set(3, 3, 3);
      scene.add(point);

      const resize = () => {
        const w = canvas.clientWidth || 400;
        renderer.setSize(w, 400, false);
        camera.aspect = w / 400;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener('resize', resize);

      let raf;
      const animate = () => {
        mesh.rotation.x += 0.004;
        mesh.rotation.y += 0.006;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      };
      animate();

      this._cleanupViewer = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        renderer.dispose();
      };
    } catch (err) {
      container.querySelector('#viewer').style.display = 'none';
      container.querySelector('#viewer-fallback').style.display = 'flex';
    }
  },

  destroy() {
    this._cleanupViewer?.();
  },
};
