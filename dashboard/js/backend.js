/** Adapter for yubair69/Ai-traffic's actual /api/status, /api/command and /ws. */
import { store } from './state/store.js';
import { PHASES } from './simulation/intersection.js';
import { boardSignals, hasSignalConflict } from './hardwareState.js';

export class Backend {
  constructor(engine) {
    this.engine = engine;
    this.link = {}; this.telemetry = null; this.cfg = null;
    this.followBoard = false; this.closed = false; this.busy = false;
    this.telSeen = null;
    this.bindControls();
    this.bootstrap();
    this.statusTimer = setInterval(() => this.renderStatus(), 250);
    window.addEventListener('pagehide', () => this.dispose());
  }
  get fresh() {
    return Boolean(this.link.connected && this.link.booted && this.telSeen !== null && performance.now() - this.telSeen < 1500);
  }
  get controlsSimulation() { return this.followBoard; }
  async bootstrap() {
    try {
      const response = await fetch('/api/status', {cache:'no-store',signal:AbortSignal.timeout(5000)});
      if (!response.ok) throw new Error('Backend unavailable');
      const status = await response.json();
      if (this.closed) return;
      this.link = status.link; this.telemetry = status.telemetry; this.cfg = status.config;
      const age = this.link.telemetry_age;
      this.telSeen = typeof age === 'number' ? performance.now() - age * 1000 : null;
    } catch { this.link = {}; }
    this.connect(); this.renderStatus();
  }
  connect() {
    if (this.closed) return;
    const socket = this.socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);
    socket.onmessage = ({data}) => {
      if (socket !== this.socket || this.closed) return;
      try {
        const message = JSON.parse(data);
        if (message.kind === 'link') this.link = message.data;
        if (message.kind === 'tel') {
          this.telemetry = message.data; this.telSeen = performance.now();
        }
        if (message.kind === 'evt') {
          const event = message.data;
          if (['BOOT','CFG'].includes(event.ev)) this.cfg = event;
          document.getElementById('hardwareEvent').textContent = `Device event: ${event.ev} · ${event.why || event.msg || ''}`;
        }
        this.update(); this.renderStatus();
      } catch { document.getElementById('hardwareEvent').textContent = 'Unreadable backend message'; }
    };
    socket.onerror = () => socket.close();
    socket.onclose = () => {
      if (socket !== this.socket) return;
      this.link.connected = false; this.update(); this.renderStatus();
      if (!this.closed) this.retry = setTimeout(() => this.bootstrap(), 2000);
    };
  }
  update() {
    const node = this.engine.network.getIntersection(store.getState().activeIntersectionId);
    if (!node) return;
    if (this.followBoard) {
      node.externalSignals = boardSignals(this.telemetry, this.fresh);
      const aGreen = node.externalSignals.S === 'GREEN';
      const bGreen = node.externalSignals.E === 'GREEN';
      node.currentPhase = aGreen ? PHASES.NS_GREEN : PHASES.EW_GREEN;
      node.isAllRed = !aGreen && !bGreen;
      node.isAmber = false;
      node.phaseTimer = (this.telemetry?.pt || 0) / 1000;
      node.allocatedGreenTime = (this.cfg?.maxG || 20000) / 1000;
    } else if (node.externalSignals) {
      node.externalSignals = null;
      node.isAllRed = true; node.allRedTimer = 0;
      node.isAmber = false; node.phaseTimer = 0;
      node.nextPhase = PHASES.NS_GREEN;
      node.clearManualOverrides();
    }
  }
  renderStatus() {
    const t = this.telemetry;
    const age = this.telSeen === null ? null : Math.max(0,(performance.now()-this.telSeen)/1000);
    document.getElementById('hardwareStatus').textContent = this.fresh ? `Arduino connected ${this.link.port || ''} · ${age.toFixed(1)}s old · ${Number(this.link.pps || 0).toFixed(1)} packets/s` : this.link.connected ? 'Arduino connected · telemetry stale / waiting for boot' : 'No Arduino connected · USB auto-detection retries every 2 seconds';
    document.getElementById('hardwareCounts').textContent = !t ? 'No board readings received' : t.sim ? `LED states measured · queues simulated by hardware backend: A ${t.a?.n ?? '—'}, B ${t.b?.n ?? '—'} · sensors offline` : `Sensor counts: A ${t.a?.ok ? t.a.n : 'invalid'}, B ${t.b?.ok ? t.b.n : 'invalid'} · mode ${t.mode}`;
    document.getElementById('hardwareLEDs').textContent = !t ? 'LEDs: unknown' : `Last reported LEDs: A ${t.la===1?'ON / stop':t.la===0?'OFF / go':'unknown'}, B ${t.lb===1?'ON / stop':t.lb===0?'OFF / go':'unknown'}${hasSignalConflict(t)?' · conflicting go signals: virtual traffic held all-red':''}`;
    document.getElementById('mlStatus').textContent = this.followBoard ? (this.fresh ? 'Simulated cars following the board signal states' : 'Board-follow mode · telemetry stale · virtual signals held all-red') : 'Local adaptive simulation · hardware telemetry shown separately';
    document.getElementById('mlDecision').textContent = 'Cars and charts are simulated. No browser vehicle data is sent to the Arduino.';
    const badge = document.getElementById('aiStatusBadge');
    if (badge) badge.textContent = this.followBoard ? (this.fresh ? 'BOARD SIGNALS' : 'BOARD STALE · ALL RED') : store.getState().isAiMode ? 'LOCAL ADAPTIVE SIMULATION' : 'LOCAL FIXED TIMER';
    document.querySelectorAll('[data-hardware-cmd]').forEach(button => {button.disabled = !this.fresh || this.busy;});
    for (const id of ['forceNSGreenBtn','forceEWGreenBtn','clearOverridesBtn','dispatchAmbulanceBtn','dispatchFireBtn','dispatchPoliceBtn','aiModeToggle']) {
      const element = document.getElementById(id); if (element) element.disabled = this.followBoard;
    }
  }
  bindControls() {
    document.getElementById('signalSource').onchange = event => {
      this.followBoard = event.target.value === 'board';
      const node = this.engine.network.getIntersection(store.getState().activeIntersectionId);
      node.clearManualOverrides(); node.emergencyState.active = false;
      store.setEmergencyStatus(null);
      this.update(); this.renderStatus();
    };
    document.querySelectorAll('[data-hardware-cmd]').forEach(button => {
      button.onclick = async () => {
        if (!this.fresh || this.busy) return;
        this.busy = true; this.renderStatus();
        const feedback = document.getElementById('hardwareCommandStatus');
        feedback.textContent = `Sending ${button.dataset.hardwareCmd}…`;
        try {
          const response = await fetch('/api/command', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cmd:button.dataset.hardwareCmd}),signal:AbortSignal.timeout(8000)});
          const result = await response.json();
          feedback.textContent = result.ok ? `Board acknowledged ${button.dataset.hardwareCmd}; LEDs update from telemetry` : `Not applied: ${result.error || response.status}`;
        } catch(error) {feedback.textContent = `Not confirmed: ${error.message}`;}
        this.busy = false; this.renderStatus();
      };
    });
  }
  dispose() {
    this.closed = true; clearInterval(this.statusTimer); clearTimeout(this.retry);
    this.socket?.close();
  }
}
