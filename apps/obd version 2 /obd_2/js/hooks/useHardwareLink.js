// Hardware link over Web Bluetooth. Falls back to a simulator when the
// Web Bluetooth API is unavailable (desktop non-Chromium, iOS Safari, etc.)
// or when no physical adapter is present — so the UI always has data to show.

const OBD_SERVICE_UUID = 0xfff0; // Common ELM327 BLE service (SPP-over-BLE bridge)
const OBD_WRITE_CHAR_UUID = 0xfff2;
const OBD_NOTIFY_CHAR_UUID = 0xfff1;

class HardwareLink extends EventTarget {
  constructor() {
    super();
    this.device = null;
    this.writeChar = null;
    this.notifyChar = null;
    this.state = 'disconnected'; // disconnected | scanning | connecting | connected | error
    this.simulated = false;
  }

  get supported() {
    return typeof navigator !== 'undefined' && !!navigator.bluetooth;
  }

  _setState(state) {
    this.state = state;
    this.dispatchEvent(new CustomEvent('statechange', { detail: { state } }));
  }

  /** Opens the real Web Bluetooth device picker. Must be called from a user gesture (click). */
  async connect() {
    if (!this.supported) {
      this._setState('error');
      throw new Error('Web Bluetooth is not supported in this browser');
    }
    try {
      this._setState('scanning');
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [OBD_SERVICE_UUID] }],
        optionalServices: [OBD_SERVICE_UUID],
      });
      this._setState('connecting');
      const server = await this.device.gatt.connect();
      const service = await server.getPrimaryService(OBD_SERVICE_UUID);
      this.writeChar = await service.getCharacteristic(OBD_WRITE_CHAR_UUID);
      this.notifyChar = await service.getCharacteristic(OBD_NOTIFY_CHAR_UUID);
      await this.notifyChar.startNotifications();
      this.notifyChar.addEventListener('characteristicvaluechanged', (e) => {
        const text = new TextDecoder().decode(e.target.value);
        this.dispatchEvent(new CustomEvent('data', { detail: { line: text.trim() } }));
      });
      this.device.addEventListener('gattserverdisconnected', () => this._setState('disconnected'));
      this.simulated = false;
      this._setState('connected');
      return { simulated: false };
    } catch (err) {
      this._setState('disconnected');
      this.dispatchEvent(new CustomEvent('error', { detail: { error: err } }));
      throw err;
    }
  }

  /** Starts the offline data simulator explicitly — no hardware or picker dialog involved. */
  simulate() {
    this._startSimulator();
  }

  /** Send a raw AT/OBD command, e.g. "01 0C". Resolves once the write completes. */
  async send(command) {
    if (this.simulated) {
      this.dispatchEvent(new CustomEvent('tx', { detail: { line: command } }));
      this._simulateReply(command);
      return;
    }
    if (!this.writeChar) throw new Error('Not connected');
    const bytes = new TextEncoder().encode(command + '\r');
    this.dispatchEvent(new CustomEvent('tx', { detail: { line: command } }));
    await this.writeChar.writeValueWithoutResponse(bytes);
  }

  disconnect() {
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    if (this._simTimer) clearInterval(this._simTimer);
    this.simulated = false;
    this._setState('disconnected');
  }

  _startSimulator() {
    this.simulated = true;
    this._setState('connected');
  }

  _simulateReply(command) {
    const pid = command.replace(/\s+/g, '');
    const byte = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    const word = (n) => Math.max(0, Math.min(65535, Math.round(n))).toString(16).padStart(4, '0').match(/../g).join(' ');
    const fake = {
      '010C': () => `41 0C ${word((700 + Math.random() * 6300) * 4)}`, // RPM = ((A*256)+B)/4
      '010D': () => `41 0D ${byte(Math.random() * 180)}`,
      '0104': () => `41 04 ${byte(Math.random() * 255)}`,
      '0105': () => `41 05 ${byte(90 + Math.random() * 10 + 40)}`, // coolant = A-40
      '010B': () => `41 0B ${byte(80 + Math.random() * 40)}`,
      '010F': () => `41 0F ${byte(25 + Math.random() * 15 + 40)}`, // intake temp = A-40
      '0110': () => `41 10 ${word((2 + Math.random() * 8) * 100)}`,
      '0111': () => `41 11 ${byte(Math.random() * 255)}`,
      '0114': () => `41 14 ${byte(0.3 + Math.random() * 0.4) } 00`, // O2 volts = A/200
      '012F': () => `41 2F ${byte(80 + Math.random() * 100)}`,
      '0142': () => `41 42 ${word((13 + Math.random() * 2) * 1000)}`,
      '0146': () => `41 46 ${byte(20 + Math.random() * 15 + 40)}`,
    };
    const gen = fake[pid];
    const line = gen ? gen() : `41 ${pid.slice(2)} 00 00`;
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent('data', { detail: { line } }));
    }, 15 + Math.random() * 20);
  }
}

export const hardwareLink = new HardwareLink();
