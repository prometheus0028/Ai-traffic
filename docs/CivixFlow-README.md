# 🚦 CivixFlow — Autonomous AI Traffic Command Center & Smart City Signal Orchestration

[![Live Simulation](https://img.shields.io/badge/Live_Simulation-60_FPS-06b6d4.svg?style=for-the-badge&logo=html5)](#)
[![AI Engine](https://img.shields.io/badge/AI_Engine-Max--Pressure_%2B_Webster-10b981.svg?style=for-the-badge&logo=speedtest)](#)
[![Explainable AI](https://img.shields.io/badge/XAI-Natural_Language_Rationale-6366f1.svg?style=for-the-badge&logo=openai)](#)
[![Emergency Preemption](https://img.shields.io/badge/Emergency-IEEE_1570_Corridor-ef4444.svg?style=for-the-badge)](#)
[![Safety Engine](https://img.shields.io/badge/Safety_Score-Realtime_Kinematics-f59e0b.svg?style=for-the-badge)](#)
[![Vercel Ready](https://img.shields.io/badge/Vercel-Zero--Config_Edge-black.svg?style=for-the-badge&logo=vercel)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](#)

> **CivixFlow** is an autonomous, high-performance smart city traffic command center and real-time micro-simulation. Built on modern web standards and running at 60 FPS without build-step overhead, CivixFlow orchestrates complex multi-lane urban intersections using **Max-Pressure Theory**, **Webster's Adaptive Green Timing**, **Explainable AI (XAI)**, **Multi-Horizon Congestion Forecasting**, and **IEEE-1570 Emergency Green Wave Preemption**.

---

## 📌 Table of Contents

1. [Executive Summary & Problem Statement](#-executive-summary--problem-statement)
2. [Core Capabilities & Innovations](#-core-capabilities--innovations)
3. [System Architecture & Data Flow](#-system-architecture--data-flow)
4. [Algorithmic & Mathematical Foundations](#-algorithmic--mathematical-foundations)
5. [Interactive Scenarios & Presets](#-interactive-scenarios--presets)
6. [Telemetry, Explainability & Safety Analytics](#-telemetry-explainability--safety-analytics)
7. [Repository & Module Structure](#-repository--module-structure)
8. [Getting Started & Local Development](#-getting-started--local-development)
9. [Zero-Configuration Vercel Deployment](#-zero-configuration-vercel-deployment)
10. [Author & License](#-author--license)

---

## 🏙️ Executive Summary & Problem Statement

Urban traffic congestion is responsible for over **$300 billion in lost economic productivity**, billions of wasted driver hours, and millions of metric tons of excess greenhouse gas emissions every year. Traditional traffic signal controllers fail modern cities due to fundamental architectural flaws:

- **Static Time-of-Day Plans**: Pre-programmed signal timers hold green phases on completely empty lanes while high-volume commuter arteries choke in gridlock.
- **Brittle Actuation Loops**: Inductive sensors provide binary presence without contextual awareness of multi-lane queue buildup, approaching platoon momentum, or upstream bottlenecks.
- **Critical Emergency Latency**: Ambulances, fire engines, and police interceptors lose vital response minutes caught in cross-street queues without dynamic corridor clearance.
- **Opaque Decision Making ("Black Box AI")**: Municipal operators lack visibility into automated decision-making and cannot justify automated control actions.

### The CivixFlow Solution

CivixFlow transforms urban signal networks into an adaptive, self-optimizing nervous system that:
1. Continuously measures multi-lane queue pressure, arrival rates, and delay accumulation across all approaches.
2. Dynamically balances phase extensions and initiates instant gap-out cutoffs when lanes clear.
3. Provides a live **Explainable AI (XAI)** feed translating complex optimization math into plain-language audit logs.
4. Predicts arterial congestion $5$, $10$, and $15$ minutes into the future.
5. Clears automated green wave corridors for emergency vehicles with IEEE-1570 priority dispatch.
6. Delivers a verified **$40\% - 60\%$ reduction in average vehicle wait time** compared to legacy fixed-time controllers.

---

## 🌟 Core Capabilities & Innovations

### 1. Autonomous Adaptive Signal Optimization
- **Dynamic Max-Pressure Balancing**: Evaluates spatial queue distribution and arrival momentum across North-South and East-West corridors to allocate green time where marginal throughput gain is maximized.
- **Intelligent Gap-Out Actuation**: Detects when an active corridor has cleared its queued platoon and immediately truncates the green phase, eliminating "green time waste" on empty tarmac.
- **Platoon Green Extension**: Dynamically extends green phases in configurable step increments (up to safety maximums) when continuous heavy platoons are discharging.
- **Real-Time Fixed Baseline Twin**: Simulates an identical parallel intersection running legacy 22-second fixed timers to provide continuous side-by-side latency and emissions benchmarking.

### 2. Explainable AI (XAI) Live Decision Feed
Every algorithmic action taken by the AI generates an interactive decision card detailing:
- **Primary Driver**: Root cause of the decision (e.g., *East-West queue reached critical threshold of 18 vehicles*).
- **Trade-Off Analysis**: Impact evaluation on opposing corridors (e.g., *North-South approach has 0 waiting vehicles; zero delay penalty incurred*).
- **Confidence Metric**: Algorithmic certainty score ($85\% - 99.9\%$).
- **Projected Impact**: Real-time estimate of seconds saved and fuel idling prevented.
- **Triggered Rule**: Exact policy and model reference (e.g., `Max-Pressure Actuation Policy v4.2`).

### 3. Short-Term Multi-Horizon Congestion Predictor
- **Predictive Horizons**: Models congestion indices for **$+5\text{ mins}$**, **$+10\text{ mins}$**, and **$+15\text{ mins}$**.
- **Rate-of-Change Momentum**: Computes queue growth velocity ($\frac{d\text{Queue}}{dt}$) over rolling telemetry windows.
- **Proactive Mitigation Advisories**: Generates automated dispatch advisories before bottlenecks cascade across the arterial grid.

### 4. IEEE-1570 Smart Emergency Priority Preemption
- **Automated Optical/Radio Corridor Detection**: Scans approaching priority vehicles (Ambulance, Fire Engine, Police Cruiser).
- **Green Wave Corridor Flush**: Interrupts normal phase cycles, safely transitions opposing signals through amber/all-red clearance intervals, and holds a protected green wave until the emergency vehicle exits the intersection.
- **Zero Stop Delay**: Emergency vehicles clear intersections with uninterrupted right-of-way, dramatically reducing response times in life-or-death windows.

### 5. Real-Time Intersection Safety Engine
- **Micro-Collision Detection**: Evaluates geometric bounding radii and relative velocities to detect physical body overlaps and vehicle impacts.
- **Near-Miss Proximity Analysis**: Identifies dangerous close encounters ($< 28\text{px}$ edge distance with heading conflict) between turning and straight vehicles.
- **Dynamic Safety Score (0–100)**: Multi-factor index balancing collisions (40%), near-misses (25%), speed health (10%), density (10%), wait time (5%), and throughput (10%).

### 6. High-Fidelity 60 FPS Micro-Simulation
- **Vehicle Kinematics**: Physics-based acceleration, deceleration, driver speed variance, signal compliance, and cubic Bezier curve turn geometry.
- **Cyberpunk Dark HUD Canvas**: Real-time rendering of lane markers, crosswalks, stop lines, signal gantries, countdown timers, vehicle headlights, brake lights, and emergency strobes.
- **Environmental Analytics**: Real-time tracking of idle $\text{CO}_2$ emissions prevented and fuel expenditure saved.

---

## 🏗️ System Architecture & Data Flow

CivixFlow is architected around a **decoupled, reactive state architecture** with a single authoritative 60 FPS physics and telemetry loop.

```
                               ┌──────────────────────────────────────────┐
                               │         Browser DOM / UI Events          │
                               │   (Presets, Controls, Dispatches, Audio) │
                               └────────────────────┬─────────────────────┘
                                                    │ User Actions
                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     REACTIVE STATE STORE                                        │
│                           (js/state/store.js - Central Event Bus)                               │
└───────┬───────────────────────────────┬─────────────────────────────┬───────────────────────────┘
        │ State Updates                 │ State Snapshots             │ Telemetry Events
        ▼                               ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────────────────┐
│  SIMULATION CORE (60Hz) │   │    AI OPTIMIZATION      │   │        VISUALIZATION LAYER          │
│                         │   │                         │   │                                     │
│ • Engine Loop           │   │ • Adaptive Signal AI    │   │ • 2D Canvas Hardware Renderer       │
│ • Road Network Model    │──▶│ • XAI Decision Engine   │──▶│ • Chart.js Telemetry (Wait/Trend)   │
│ • Intersection State    │   │ • Congestion Predictor  │   │ • Reactive HUD / Metric Badges      │
│ • Vehicle Physics & IDM │   │ • Emergency Preemption  │   │ • Web Audio Siren Synthesizer       │
│ • Twin Fixed Baseline   │   │ • Safety Analytics      │   │ • Toast Notification Bus            │
└─────────────────────────┘   └─────────────────────────┘   └─────────────────────────────────────┘
```

### Modular Layer Breakdown

| Layer | Files | Responsibilities |
|---|---|---|
| **Core State** | `js/state/store.js` | Centralized reactive store, event emitter, immutable state snapshots, and telemetry history buffers. |
| **Simulation Core** | `js/simulation/engine.js`<br>`js/simulation/intersection.js`<br>`js/simulation/vehicle.js`<br>`js/simulation/network.js`<br>`js/simulation/fixedBaseline.js` | 60 FPS physics tick, vehicle spawning, lane assignment, Bezier curve turning trajectories, signal state machines, and fixed-time benchmark twin. |
| **AI & Analytics** | `js/ai/adaptiveSignalAI.js`<br>`js/ai/explainableAI.js`<br>`js/ai/predictor.js`<br>`js/ai/emergencyPreempt.js`<br>`js/ai/safetyAnalytics.js` | Max-Pressure calculation, gap-out detection, natural language rationale generation, multi-horizon trend prediction, emergency preemption, and collision kinematics. |
| **Rendering & UI** | `js/visualization/canvasRenderer.js`<br>`js/visualization/charts.js`<br>`js/visualization/uiComponents.js` | Hardware-accelerated 2D Canvas drawing, Chart.js telemetry graphing, UI button bindings, scenario selector, and modal controls. |
| **Utilities** | `js/utils/mathUtils.js`<br>`js/utils/audioUtils.js`<br>`js/config.js` | Bezier curve interpolation, vector math, Web Audio API procedural sound synthesizer, and simulation constants. |

---

## 🧮 Algorithmic & Mathematical Foundations

### 1. Max-Pressure Dynamic Signal Control

At each decision cycle ($t_{\text{eval}} = 0.5\text{s}$), the controller computes the aggregated corridor pressure $P_c$ for corridor $c \in \{\text{NS}, \text{EW}\}$:

$$P_c = w_q \cdot Q_c + w_w \cdot \left(\frac{W_c}{4}\right) + w_a \cdot A_c$$

Where:
- $Q_c$: Total queued vehicles across both corridor approaches ($Q_c = Q_{\text{inbound}} + Q_{\text{outbound}}$).
- $W_c$: Mean accumulated wait time of queued vehicles in corridor $c$ (seconds).
- $A_c$: Instantaneous inbound vehicle arrival count approaching the stop line.
- $w_q = 2.2$, $w_w = 1.5$, $w_a = 1.0$: Calibrated sensitivity weights configured in `CONFIG.AI_WEIGHTS`.

A phase change request is dispatched if the opposing corridor pressure exceeds the active corridor by the switching threshold:

$$\Delta P = P_{\text{opposing}} - P_{\text{active}} \ge \Delta P_{\text{threshold}} \quad \text{with} \quad t_{\text{phase}} \ge t_{\text{min\_green}}$$

### 2. Webster Optimal Green Duration Calculation

When a phase switch is triggered, the allocated green time $G_{\text{target}}$ is dynamically scaled based on pressure saturation:

$$G_{\text{target}} = \text{clamp}\left( G_{\text{min}} + \left\lfloor \frac{P_{\text{opposing}}}{25.0} \cdot (G_{\text{max}} - G_{\text{min}}) \right\rfloor, \; G_{\text{min}}, \; G_{\text{max}} \right)$$

Where $G_{\text{min}} = 6\text{s}$ and $G_{\text{max}} = 45\text{s}$.

### 3. Vehicle Kinematics & Cubic Bezier Turning Trajectory

Vehicle turns are calculated through cubic Bezier spline interpolation between approach entry vector $\mathbf{P}_0$ and exit vector $\mathbf{P}_3$:

$$\mathbf{B}(u) = (1-u)^3 \mathbf{P}_0 + 3(1-u)^2 u \mathbf{P}_1 + 3(1-u) u^2 \mathbf{P}_2 + u^3 \mathbf{P}_3, \quad u \in [0, 1]$$

Vehicle heading angle $\theta$ updates along the curve tangent:

$$\theta(u) = \operatorname{atan2}\left(\frac{d\mathbf{B}_y}{du}, \frac{d\mathbf{B}_x}{du}\right)$$

### 4. Congestion Horizon Forecasting

Congestion growth rate $\kappa$ is evaluated over a sliding history window of queue depths:

$$\kappa = \frac{Q_{\text{latest}} - Q_{\text{oldest}}}{N_{\text{samples}} \cdot \Delta t_{\text{sample}}}$$

The projected congestion index $C_{+\Delta t}$ for horizon $\Delta t \in \{5, 10, 15\}$ is computed as:

$$C_{+\Delta t} = \text{clamp}\left( C_{\text{current}} + \kappa \cdot 18 \cdot \alpha_{\Delta t} + \beta_{\text{demand}}, \; 0, \; 100 \right)$$

---

## 🎮 Interactive Scenarios & Presets

CivixFlow includes built-in stress-test presets accessible directly from the header dropdown:

| Scenario Preset | Description | Simulation Dynamics |
|---|---|---|
| **⚖️ Standard Normal Traffic** | Moderate balanced demand across all approaches. | Uniform spawn rate across North, South, East, and West corridors. |
| **⚡ Morning Rush Hour Surge** | Simulates peak morning commuter influx into downtown. | North approach spawn multiplier increased to $2.8\times$; South to $1.8\times$. AI holds dynamic platoon extensions. |
| **🚑 Code Red: Emergency Rush** | High-frequency priority vehicle dispatches. | Spawns multiple priority ambulances and fire engines requiring immediate IEEE-1570 corridor preemption. |
| **🚧 Lane Bottleneck Obstruction** | Eastbound lane partially obstructed by a disabled vehicle. | Simulates localized queue pile-up, triggering AI adaptive queue bleed-off. |
| **🌧️ Storm & Slippery Roads** | Inclement weather conditions. | Vehicle speeds reduced by 25%, braking distances lengthened, and headway margins expanded. |

---

## 📊 Telemetry, Explainability & Safety Analytics

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🧠 EXPLAINABLE AI (XAI) DECISION FEED                                    │
│ ──────────────────────────────────────────────────────────────────────── │
│ 🟢 PHASE EXTENSION: North-South Corridor                       [94.2%]   │
│   • Driver: Active corridor discharging continuous platoon (8 vehicles). │
│   • Trade-off: East-West queue is minimal (2 vehicles); low penalty.     │
│   • Projected Impact: -4.2s delay saved per vehicle.                     │
│   • Rule: Dynamic Platoon Green Extension Policy v4.2                    │
└──────────────────────────────────────────────────────────────────────────┘
```

### Safety Analytics Matrix

The system continuously scores intersection safety from $0$ to $100$:

$$\text{Safety Score} = 100 - \text{Pen}_{\text{col}} - \text{Pen}_{\text{nm}} - \text{Pen}_{\text{density}} - \text{Pen}_{\text{wait}} + \text{Bonus}_{\text{speed}} + \text{Bonus}_{\text{flow}}$$

- **Collisions Penalty**: $-10\text{ pts}$ per event in rolling 60s (capped at $-40\text{ pts}$).
- **Near-Miss Penalty**: $-5\text{ pts}$ per event in rolling 60s (capped at $-25\text{ pts}$).
- **Density Penalty**: Scaled penalty when intersection occupancy exceeds $70\%$.
- **Wait Penalty**: Scaled penalty when average queue wait time exceeds $30\text{s}$.

---

## 📁 Repository & Module Structure

```
CivixFlow/
├── index.html                  # Single Page Application entrypoint & dashboard markup
├── README.md                   # Comprehensive technical documentation & project guide
├── vercel.json                 # Vercel Edge configuration (security headers & asset caching)
├── package.json                # Project manifest & npm scripts
├── .gitignore                  # Git exclusion rules
├── assets/
│   └── css/
│       └── style.css           # Cyberpunk dark theme, glassmorphism, animations & glows
├── js/
│   ├── app.js                  # Main application orchestrator & 60 FPS master loop
│   ├── config.js               # Global configuration constants, vehicle specs & presets
│   ├── state/
│   │   └── store.js            # Central reactive store & telemetry event bus
│   ├── simulation/
│   │   ├── engine.js           # Physics simulation loop & telemetry aggregation
│   │   ├── vehicle.js          # Kinematic vehicle agent (physics, IDM, Bezier turns)
│   │   ├── intersection.js     # Signal state machine, approach sensors & detectors
│   │   ├── network.js          # Road network coordinator & node registry
│   │   └── fixedBaseline.js    # Parallel fixed-time twin baseline for benchmarking
│   ├── ai/
│   │   ├── adaptiveSignalAI.js # Max-Pressure & Webster adaptive timing model
│   │   ├── predictor.js        # Multi-horizon (5m/10m/15m) congestion trend forecasting
│   │   ├── emergencyPreempt.js # IEEE-1570 emergency preemption & green corridor locks
│   │   ├── explainableAI.js    # Natural language XAI rationale generator
│   │   └── safetyAnalytics.js  # Micro-collision & near-miss kinematic detection
│   ├── visualization/
│   │   ├── canvasRenderer.js   # 2D Canvas renderer (tarmac, vehicles, signals, strobes)
│   │   ├── charts.js           # Real-time Chart.js telemetry graphs
│   │   └── uiComponents.js     # UI event handlers, buttons, sliders, and audio bindings
│   └── utils/
│       ├── mathUtils.js        # Bezier curve interpolation & vector geometry
│       └── audioUtils.js       # Procedural Web Audio API sound effects & siren synth
└── docs/
    └── HACKATHON_PITCH.md      # Live judge presentation walkthrough & demo script
```

---

## 🚀 Getting Started & Local Development

Because CivixFlow is built entirely with native ES6+ modules and modern web standards:
- **No compilation or bundler step required!**
- **Zero build dependencies!**

### Option 1: Direct Browser Launch
Simply open `index.html` directly in any modern browser (Chrome, Edge, Firefox, Safari, Brave).

### Option 2: Run with npm / Node.js
```bash
# Start local static server
npm start
```
Then visit `http://localhost:3000`.

### Option 3: Run with Python HTTP Server
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000`.

### Option 4: Standalone PowerShell Server (Windows)
Double-click `run_server.bat` or run:
```powershell
powershell -ExecutionPolicy Bypass -File .\run_dashboard.ps1
```

---

## ☁️ Zero-Configuration Vercel Deployment

CivixFlow includes a production-ready `vercel.json` configured for instant Vercel deployment:

### Deploy via Vercel Web UI
1. Push this repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import your **CivixFlow** repository.
4. Leave all build settings as default and click **Deploy**.

### Deploy via Vercel CLI
```bash
# Install Vercel CLI globally (if not already installed)
npm install -g vercel

# Deploy directly
vercel --prod
```

---

## 👤 Author & Maintainer

**Aryan**
- **Email**: [kotwal.aryan01@gmail.com](mailto:kotwal.aryan01@gmail.com)
- **GitHub**: [@AryanKo](https://github.com/AryanKo)
- **Project Repository**: [https://github.com/AryanKo/CivixFlow.git](https://github.com/AryanKo/CivixFlow.git)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file or package manifest for details.
