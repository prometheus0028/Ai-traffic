# CivixFlow + TrafficMind hardware

The **local CivixFlow frontend remains the primary dashboard**, now served by the actual FastAPI/USB backend from [yubair69/Ai-traffic](https://github.com/yubair69/Ai-traffic). The original React frontend remains in frontend/ for reference; dashboard/ is now the primary served CivixFlow interface. Arduino firmware and the original phone remote are included.

## Run locally

Install **Python 3.11+**, then double-click **start.bat**. The first launch creates .venv, installs the small Python runtime, and opens **http://127.0.0.1:8000**. No Node.js or frontend build is needed: all CSS, charts and icons are bundled. Internet is needed for the first Python dependency installation; subsequent launches run locally.

```powershell
.\start.ps1
# If 8000 is busy; optionally override auto-detected Arduino port:
.\start.ps1 -Port 8001 -SerialPort COM5
# Laptop only, without exposing the phone remote to the LAN:
.\start.ps1 -LaptopOnly -NoBrowser
# After dependencies are installed:
.\.venv\Scripts\python.exe run.py --port 8000 --serial-port COM5
```

Port 8000 is the web server port; `--serial-port COM5` is the USB device. The upstream `python run.py --port COM5` syntax is also accepted for compatibility. `TRAFFIC_PORT` also overrides USB detection. `TRAFFIC_DB` overrides the SQLite log path (default data/trafficmind.db). Ctrl+C stops the server and closes the USB port/database. On macOS/Linux use `sh start.sh`; these launchers have not been tested on those platforms.

Without an Arduino, the primary frontend still runs its smooth local adaptive simulation. Hardware status says disconnected and physical controls remain disabled. This is the expected state when no board is plugged in.

## Arduino + phone hotspot

The actual connection is:

```text
Phone browser -- hotspot/Wi-Fi --> laptop running this app -- USB --> Arduino Uno
```

The Arduino does not join the hotspot and needs no IP address or TCP telemetry server. The laptop scans every two seconds for Arduino/CH340/CP210x/FTDI USB serial devices at **115200 baud**. An unusual USB chip can use the manual COM-port override above. Close Arduino IDE Serial Monitor so it releases the port. Opening the connection resets an Uno; the upstream backend restores its last reported LED state after a direct-mode reboot.

1. Open `traffic_controller/traffic_controller.ino` in Arduino IDE 2. Select Arduino Uno and the board's USB port.
2. Install the **VL53L0X library by Pololu** through Library Manager, upload, then close Serial Monitor.
3. Connect the laptop to your phone's hotspot and run start.bat.
4. The terminal prints the laptop's LAN address, such as `http://172.20.10.4:8000/remote`. Open the **actual printed address** on the phone; localhost on the phone does not reach the laptop. If multiple adapters appear, choose the hotspot/Wi-Fi adapter.
5. Permit Python on the intended Private network if Windows asks. Anyone on this trusted hotspot can use the remote; the upstream interface has no login.

The original `/remote` page polls reported LED state and sends the backend's whitelisted commands. The main CivixFlow page has separate **physical** A/B go, both-stop and priority buttons. These wait for board ACKs; they do not optimistically claim a physical LED changed. Firmware is included **unchanged**; no board was flashed during integration. Wiring: [docs/HARDWARE_WIRING_AND_SETUP.md](docs/HARDWARE_WIRING_AND_SETUP.md).

## Simulation and real device data

- Default signal source is **Local adaptive simulation**. The existing CivixFlow UI, fixed 60 Hz physics, interpolated cars, sprite/road caches, scenarios, playback speed and charts are retained. Browser car positions/counts are never sent to the Arduino.
- Select **Follow Arduino signals** to drive the virtual junction from fresh device signals. Hardware A is displayed as virtual N/S and B as E/W; this groups the four-way visual into the board's two physical approaches. Car arrivals, trajectories and dashboard metrics remain simulated, not measured physical cars.
- Physical LED ON means red/stop; LED OFF means go. The firmware boots with `BOOT_DIRECT = true`: LEDs are manually controlled, sensors are offline and the upstream backend marks its generated queue estimates `sim: true`. The dashboard labels this explicitly. Those queues are not presented as sensor measurements or fed into CivixFlow metrics.
- In board-follow mode, stale/disconnected telemetry or both LEDs off holds all **virtual** signals red. Existing simulation-only manual/emergency buttons are disabled in that mode. Browser pause/speed affect the animated cars only; device time and the physical board keep running.
- `/remote` retains the upstream both-off LED-bench command. Both LEDs off does not release perpendicular virtual traffic. Physical firmware behavior is unchanged.
- To use the original sensor-based automatic firmware, follow the upstream wiring/calibration instructions, set `BOOT_DIRECT = false` and flash deliberately. The shipped source defaults are preserved.
- The current controller is a pressure/gap-out heuristic, not a trained ML model. Congestion, CO2, safety and baseline widgets are simulation estimates, not real-world accuracy or performance claims. No additional ML inference model is introduced by this integration.

## Verify, rebuild and package

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest tests -q
npm ci
npm test
npm run build
.\.venv\Scripts\python.exe scripts/package.py
```

The hardware repo's 60 original tests pass before integration. The integrated suite adds primary-page/remote serving, command validation, WebSocket initial snapshots, actual LED polarity, stale/conflicting signal handling, and serial shutdown. Physical USB/hotspot operation still requires a real-board test; automated tests use injected serial links and protocol fixtures.

The portable `release/CivixFlow-Hardware.zip` includes the primary frontend, hardware backend, original remote, unchanged firmware, wiring docs, launchers and tests. It excludes databases, private chat history, vendor clones, virtual environments, node_modules and unrelated experimental adapters. The original backend/ package remains the active hardware backend. Source provenance and adaptation details are in `INTEGRATION_HANDOFF.md` and `THIRD_PARTY_NOTICES.md`.

At frontend build time, npm audit reported seven advisories in Tailwind 3's transitive build tooling (five high, two moderate). Compatible fixes did not resolve them. Those build dependencies are absent from the ZIP and are not served at runtime. Rebuild trusted source only.
