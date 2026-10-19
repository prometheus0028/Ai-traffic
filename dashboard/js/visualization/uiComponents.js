/**
 * AI Traffic Command Center - UI Component Binder & Interactive Controller
 */

import { store } from '../state/store.js';
import { CONFIG } from '../config.js';
import { soundFx } from '../utils/audioUtils.js';
import { SafetyAnalytics } from '../ai/safetyAnalytics.js';

export class UIComponents {
  constructor(engine) {
    this.engine = engine;
    this.initEventListeners();
    this.bindStateSubscriptions();
  }

  initEventListeners() {
    // 1. AI Auto-Pilot Switch
    const aiToggle = document.getElementById('aiModeToggle');
    if (aiToggle) {
      aiToggle.addEventListener('change', (e) => {
        const isEnabled = e.target.checked;
        store.setAiMode(isEnabled);
        soundFx.playClick();
        this.updateAIStatusBadge(isEnabled);
      });
    }

    // 2. Play / Pause Button
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        const isRunning = store.togglePlayPause();
        soundFx.playClick();
        playPauseBtn.innerHTML = isRunning
          ? `<i data-lucide="pause" class="w-4 h-4 mr-1"></i> Pause`
          : `<i data-lucide="play" class="w-4 h-4 mr-1"></i> Resume`;
        if (window.lucide) window.lucide.createIcons();
      });
    }

    // 3. Speed Multiplier Buttons
    document.querySelectorAll('.speed-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.getAttribute('data-speed'));
        store.setSpeed(speed);
        soundFx.playClick();

        document.querySelectorAll('.speed-btn').forEach((b) => {
          b.classList.remove('bg-cyan-600', 'text-white');
          b.classList.add('bg-slate-800', 'text-slate-400');
        });
        btn.classList.remove('bg-slate-800', 'text-slate-400');
        btn.classList.add('bg-cyan-600', 'text-white');
      });
    });

    // 4. Scenario Preset Dropdown / Buttons
    const presetSelect = document.getElementById('scenarioPresetSelect');
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        const presetKey = e.target.value;
        store.setPreset(presetKey);
        this.engine.network.applyScenarioPreset(presetKey);
        soundFx.playClick();
        this.showToast(`Scenario Loaded: ${CONFIG.PRESETS[presetKey]?.name || presetKey}`);
      });
    }

    // 5. Intersection Selector Tabs
    document.querySelectorAll('.node-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nodeId = btn.getAttribute('data-node-id');
        store.setActiveIntersection(nodeId);
        soundFx.playClick();

        document.querySelectorAll('.node-tab-btn').forEach((b) => {
          b.classList.remove('border-cyan-500', 'text-cyan-400', 'bg-cyan-950/40');
          b.classList.add('border-transparent', 'text-slate-400');
        });
        btn.classList.add('border-cyan-500', 'text-cyan-400', 'bg-cyan-950/40');
        btn.classList.remove('border-transparent', 'text-slate-400');
      });
    });

    // 6. Emergency Dispatch Buttons
    const dispatchAmbulanceBtn = document.getElementById('dispatchAmbulanceBtn');
    if (dispatchAmbulanceBtn) {
      dispatchAmbulanceBtn.addEventListener('click', () => {
        const activeNode = store.getState().activeIntersectionId;
        this.engine.dispatchEmergencyVehicle('AMBULANCE', 'S', activeNode);
        soundFx.playEmergencySiren();
        this.showToast('🚨 Ambulance dispatched! Green Corridor Preemption requested.');
      });
    }

    const dispatchFireBtn = document.getElementById('dispatchFireBtn');
    if (dispatchFireBtn) {
      dispatchFireBtn.addEventListener('click', () => {
        const activeNode = store.getState().activeIntersectionId;
        this.engine.dispatchEmergencyVehicle('FIRE_TRUCK', 'W', activeNode);
        soundFx.playEmergencySiren();
        this.showToast('🚒 Fire Engine dispatched! Locking cross-traffic.');
      });
    }

    const dispatchPoliceBtn = document.getElementById('dispatchPoliceBtn');
    if (dispatchPoliceBtn) {
      dispatchPoliceBtn.addEventListener('click', () => {
        const activeNode = store.getState().activeIntersectionId;
        this.engine.dispatchEmergencyVehicle('POLICE', 'N', activeNode);
        soundFx.playEmergencySiren();
        this.showToast('🚓 Police Interceptor dispatched! Priority lane clearing.');
      });
    }

    // 7. Manual Signal Override Buttons
    const forceNSBtn = document.getElementById('forceNSGreenBtn');
    if (forceNSBtn) {
      forceNSBtn.addEventListener('click', () => {
        const activeNode = this.engine.network.getIntersection(store.getState().activeIntersectionId);
        if (activeNode) {
          activeNode.setManualOverride('N', 'GREEN');
          activeNode.setManualOverride('S', 'GREEN');
          activeNode.setManualOverride('E', 'RED');
          activeNode.setManualOverride('W', 'RED');
          soundFx.playClick();
          this.showToast('Manual Override: North-South Forced GREEN');
        }
      });
    }

    const forceEWBtn = document.getElementById('forceEWGreenBtn');
    if (forceEWBtn) {
      forceEWBtn.addEventListener('click', () => {
        const activeNode = this.engine.network.getIntersection(store.getState().activeIntersectionId);
        if (activeNode) {
          activeNode.setManualOverride('E', 'GREEN');
          activeNode.setManualOverride('W', 'GREEN');
          activeNode.setManualOverride('N', 'RED');
          activeNode.setManualOverride('S', 'RED');
          soundFx.playClick();
          this.showToast('Manual Override: East-West Forced GREEN');
        }
      });
    }

    const clearOverridesBtn = document.getElementById('clearOverridesBtn');
    if (clearOverridesBtn) {
      clearOverridesBtn.addEventListener('click', () => {
        const activeNode = this.engine.network.getIntersection(store.getState().activeIntersectionId);
        if (activeNode) {
          activeNode.clearManualOverrides();
          soundFx.playClick();
          this.showToast('Manual Overrides Cleared - Returning to AI/Standard cycle');
        }
      });
    }

    // 8. Audio Mute Toggle
    const muteBtn = document.getElementById('audioMuteBtn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = soundFx.toggleMute();
        muteBtn.innerHTML = isMuted
          ? `<i data-lucide="volume-x" class="w-5 h-5 text-red-400"></i>`
          : `<i data-lucide="volume-2" class="w-5 h-5 text-cyan-400"></i>`;
        if (window.lucide) window.lucide.createIcons();
      });
    }

    // 9. Judge Presentation / Pitch Modal
    const pitchModalBtn = document.getElementById('pitchModalBtn');
    const pitchModal = document.getElementById('pitchModal');
    const closePitchModal = document.getElementById('closePitchModal');

    if (pitchModalBtn && pitchModal) {
      pitchModalBtn.addEventListener('click', () => {
        pitchModal.classList.remove('hidden');
        pitchModal.classList.add('flex');
      });
    }
    if (closePitchModal && pitchModal) {
      closePitchModal.addEventListener('click', () => {
        pitchModal.classList.add('hidden');
        pitchModal.classList.remove('flex');
      });
    }
  }

  bindStateSubscriptions() {
    // 1. Telemetry Updates
    store.on('telemetry-updated', (snapshot) => {
      this.updateTelemetryDOM(snapshot);
    });

    // 2. AI Decision Feed
    store.on('ai-decision-added', (decision) => {
      this.renderAIDecisionItem(decision);
    });

    // 3. Predictions update
    store.on('predictions-updated', ({ intersectionId, predictionData }) => {
      if (intersectionId === store.getState().activeIntersectionId) {
        this.updatePredictionDOM(predictionData);
      }
    });

    // 4. Intersection change
    store.on('intersection-changed', (nodeId) => {
      const node = this.engine.network.getIntersection(nodeId);
      if (node) {
        const nameEl = document.getElementById('activeNodeName');
        const districtEl = document.getElementById('activeNodeDistrict');
        const descEl = document.getElementById('activeNodeDesc');
        if (nameEl) nameEl.textContent = node.name;
        if (districtEl) districtEl.textContent = node.district;
        if (descEl) descEl.textContent = node.description;
      }
    });
  }

  updateAIStatusBadge(isEnabled) {
    const badge = document.getElementById('aiStatusBadge');
    if (badge) {
      if (isEnabled) {
        badge.className = 'px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-600/50 flex items-center gap-1.5';
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> AI ADAPTIVE OPTIMIZATION ACTIVE`;
      } else {
        badge.className = 'px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-950/80 text-amber-400 border border-amber-600/50 flex items-center gap-1.5';
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span> LEGACY FIXED-TIMER BASELINE`;
      }
    }
  }

  updateTelemetryDOM(snap) {
    // Metric 1: Average Wait Time
    const waitEl = document.getElementById('metricAvgWait');
    if (waitEl) waitEl.textContent = `${snap.avgWaitTimeAI}s`;

    const waitDiffEl = document.getElementById('metricWaitDiff');
    if (waitDiffEl) {
      if (snap.avgWaitTimeFixed > snap.avgWaitTimeAI) {
        const pctSaved = Math.round(((snap.avgWaitTimeFixed - snap.avgWaitTimeAI) / Math.max(0.1, snap.avgWaitTimeFixed)) * 100);
        waitDiffEl.className = 'text-[10px] font-semibold text-emerald-400 mt-1 flex items-center gap-1';
        waitDiffEl.innerHTML = `<i data-lucide="trending-down" class="w-3 h-3"></i> -${pctSaved}% vs fixed baseline (${snap.avgWaitTimeFixed}s)`;
      } else if (snap.avgWaitTimeFixed < snap.avgWaitTimeAI) {
        const pctDiff = Math.round(((snap.avgWaitTimeAI - snap.avgWaitTimeFixed) / Math.max(0.1, snap.avgWaitTimeFixed)) * 100);
        waitDiffEl.className = 'text-[10px] font-semibold text-amber-400 mt-1 flex items-center gap-1';
        waitDiffEl.innerHTML = `<i data-lucide="trending-up" class="w-3 h-3"></i> +${pctDiff}% vs baseline (${snap.avgWaitTimeFixed}s)`;
      } else {
        waitDiffEl.className = 'text-[10px] font-semibold text-slate-400 mt-1 flex items-center gap-1';
        waitDiffEl.innerHTML = `<span>Parity with fixed baseline (${snap.avgWaitTimeFixed}s)</span>`;
      }
      if (window.lucide) {
        try { window.lucide.createIcons({ root: waitDiffEl }); } catch (e) {}
      }
    }

    // Metric 2: Congestion Score
    const congEl = document.getElementById('metricCongestion');
    const congBar = document.getElementById('metricCongestionBar');
    if (congEl) congEl.textContent = `${snap.congestion}%`;
    if (congBar) congBar.style.width = `${snap.congestion}%`;

    // Metric 3: Total Throughput
    const tpEl = document.getElementById('metricThroughput');
    if (tpEl) tpEl.textContent = `${snap.throughput} veh/min`;

    // Metric 4: CO2 Saved
    const co2El = document.getElementById('metricCO2');
    if (co2El) co2El.textContent = `${snap.co2SavedKg} kg`;

    // Active vehicles badge
    const activeVehEl = document.getElementById('activeVehicleCount');
    if (activeVehEl) activeVehEl.textContent = `${snap.activeVehicles} Active Vehicles`;

    // Safety Score panel
    if (snap.safetyMetrics) this.updateSafetyDOM(snap.safetyMetrics, snap);
  }

  updateSafetyDOM(sm, snap) {
    const score    = sm.safetyScore ?? 100;
    const cat      = SafetyAnalytics.getCategory(score);
    const concern  = SafetyAnalytics.getPrimaryConcern(score, {
      collisionsLast60s: sm.collisionsRecent ?? 0,
      nearMissesLast60s: sm.nearMissesRecent ?? 0,
      densityPct:        sm.densityPct ?? 0,
      avgWaitTime:       snap.avgWaitTime ?? 0,
      avgSpeed:          (sm.avgSpeedKmh ?? 0) / 10,
    });

    const scoreEl   = document.getElementById('safetyScoreValue');
    const badgeEl   = document.getElementById('safetyScoreBadge');
    const barEl     = document.getElementById('safetyScoreBar');
    const concernEl = document.getElementById('safetyConcern');
    const colEl     = document.getElementById('safetyCollisions');
    const nmEl      = document.getElementById('safetyNearMisses');
    const speedEl   = document.getElementById('safetyAvgSpeed');
    const densEl    = document.getElementById('safetyDensity');

    // Color based on score
    const barColor = score >= 75 ? '#34d399' : score >= 60 ? '#facc15' : score >= 40 ? '#fb923c' : '#ef4444';

    if (scoreEl)   { scoreEl.textContent = score; scoreEl.style.color = barColor; }
    if (badgeEl)   { badgeEl.textContent = cat.label; badgeEl.className = `px-2 py-0.5 text-[10px] font-bold rounded border ${cat.bg} ${cat.color} ${cat.border}`; }
    if (barEl)     { barEl.style.width = `${score}%`; barEl.style.background = barColor; }
    if (concernEl) concernEl.textContent = concern;
    if (colEl)     colEl.textContent = sm.collisionsTotal ?? 0;
    if (nmEl)      nmEl.textContent  = sm.nearMissesTotal ?? 0;
    if (speedEl)   speedEl.textContent  = `${sm.avgSpeedKmh ?? 0} km/h`;
    if (densEl)    densEl.textContent   = `${sm.densityPct ?? 0}%`;
  }

  updatePredictionDOM(pred) {
    const pred5El = document.getElementById('pred5Min');
    const pred10El = document.getElementById('pred10Min');
    const pred15El = document.getElementById('pred15Min');
    const trendBadge = document.getElementById('predTrendBadge');
    const adviceEl = document.getElementById('predAdvice');

    if (pred5El) pred5El.textContent = `${pred[5]}%`;
    if (pred10El) pred10El.textContent = `${pred[10]}%`;
    if (pred15El) pred15El.textContent = `${pred[15]}%`;

    if (trendBadge) {
      if (pred.trend === 'RAPID_INCREASE' || pred.isBottleneckRisk) {
        trendBadge.className = 'px-2 py-0.5 text-xs font-semibold rounded bg-red-950 text-red-400 border border-red-700';
        trendBadge.textContent = 'HIGH CONGESTION RISK';
      } else if (pred.trend === 'CLEARING') {
        trendBadge.className = 'px-2 py-0.5 text-xs font-semibold rounded bg-emerald-950 text-emerald-400 border border-emerald-700';
        trendBadge.textContent = 'CLEARING TREND';
      } else {
        trendBadge.className = 'px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 text-cyan-400 border border-slate-700';
        trendBadge.textContent = 'STEADY STABLE';
      }
    }

    if (adviceEl) adviceEl.textContent = pred.recommendedAction;
  }

  renderAIDecisionItem(dec) {
    const feed = document.getElementById('aiDecisionFeed');
    if (!feed) return;

    const timeStr = dec.timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    // Future backend decisions are data, not markup.
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    dec = {...dec, ...Object.fromEntries(['action','primaryReason','impact','tradeOff','confidence','rule'].map(key => [key, escape(dec[key])]))};

    let borderClass = 'border-cyan-500/40 bg-slate-900/80';
    let badgeClass = 'bg-cyan-950 text-cyan-400 border-cyan-700';

    if (dec.type === 'EMERGENCY_PREEMPTION') {
      borderClass = 'border-red-500/80 bg-red-950/20';
      badgeClass = 'bg-red-950 text-red-400 border-red-700';
    } else if (dec.type === 'GREEN_EXTENSION') {
      borderClass = 'border-emerald-500/40 bg-emerald-950/20';
      badgeClass = 'bg-emerald-950 text-emerald-400 border-emerald-700';
    }

    const card = document.createElement('div');
    card.className = `p-3.5 rounded-lg border ${borderClass} mb-3 text-xs transition-all hover:border-cyan-400 hover:shadow-lg animate-fadeIn`;

    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="px-2 py-0.5 text-[11px] font-bold rounded border ${badgeClass}">${dec.action}</span>
        <span class="text-slate-400 font-mono text-[10px]">${timeStr}</span>
      </div>
      <div class="text-slate-300 font-medium mb-1.5 leading-relaxed">
        <span class="text-slate-400 font-normal">Primary Driver:</span> ${dec.primaryReason}
      </div>
      <div class="bg-slate-950/60 p-2 rounded border border-slate-800/80 space-y-1 text-[11px]">
        <div class="text-slate-400"><strong class="text-emerald-400">Impact:</strong> ${dec.impact}</div>
        <div class="text-slate-400"><strong class="text-slate-300">Trade-Off:</strong> ${dec.tradeOff}</div>
        <div class="flex justify-between items-center pt-1 border-t border-slate-800 text-[10px] text-slate-400">
          <span>Confidence: <strong class="text-cyan-400">${dec.confidence}%</strong></span>
          <span class="italic text-slate-400">${dec.rule}</span>
        </div>
      </div>
    `;

    feed.insertBefore(card, feed.firstChild);

    // Prune excessive elements
    while (feed.children.length > 20) {
      feed.removeChild(feed.lastChild);
    }
  }

  showToast(message) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'px-4 py-2.5 rounded-lg bg-slate-900 border border-cyan-500/60 text-slate-200 text-xs shadow-2xl flex items-center gap-2 animate-bounce';
    toast.innerHTML = `<span class="w-2 h-2 rounded-full bg-cyan-400"></span> ${message}`;

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s ease';
      setTimeout(() => toast.remove(), 500);
    }, 3200);
  }
}
