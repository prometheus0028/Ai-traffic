# Integration record and handoff

## Sources

- Primary frontend: the existing local CivixFlow frontend, with the smooth animation work from AryanKo/CivixFlow main commit 153b232bdf38dbe38c0f580028d54caa0e400ffd. Do not replace it with the hardware repository's React frontend.
- Hardware backend/firmware/phone remote: https://github.com/yubair69/Ai-traffic at commit 51dce2431a7c6c757df429cd163112ffe35add00.
- Imported backend lives in backend/; upstream tests in tests/. The Arduino sketch is copied byte-for-byte to traffic_controller/traffic_controller.ino.
- No unrelated speculative adapter or standalone ML model is included.

## Actual architecture

run.py starts backend.main:build_app on FastAPI/Uvicorn, default 0.0.0.0:8000 for hotspot access. It serves the CivixFlow dashboard/ as the root static site; the original React frontend/ remains available as source reference. API routes, /ws and /remote are registered before the static mount. There is no Vite or React build and no mandatory Node install to run it.

The phone connects to the laptop's LAN IP over Wi-Fi; the laptop discovers the Arduino over USB. It is not phone-to-board TCP. Default USB baud is 115200; --serial-port or TRAFFIC_PORT is an override. --port is the HTTP port. Runtime data is under data/trafficmind.db unless TRAFFIC_DB is set.

## Real backend contract now implemented

| Route | Behavior |
| --- | --- |
| GET /api/status | {link,telemetry,config}; link includes connected,port,booted,pps,parse_errors,last_packet_age and added telemetry_age |
| WS /ws | JSON envelope {kind,data}, kinds tel/evt/ack/link; starts with link status and any configuration/fresh telemetry |
| POST /api/command | {cmd}; original whitelist, actual serial forwarding and ACK result {ok,ack,error?} |
| GET /api/history?seconds=120 | Original backend telemetry ring; may contain sim:true direct-mode estimates |
| GET /api/events?limit=100 | Original event history |
| GET /api/stats | Backend session stats; 404 before a BOOT-created session |
| GET /remote | The original standalone LED phone remote |

The original command whitelist is PING, CFG, CAL, CAR:10..500, E:A, E:B, E:OFF and L:[01][01]. Firmware input is newline-terminated text; output is newline-terminated JSON with type tel/evt/ack. LED 1=red/on and 0=go/off. CAR and L ACK keys are the bare command name, matching the upstream SerialLink implementation.

No former /api/connection, /api/ports, /ws/hardware or /ws/simulation placeholder route is used. No browser simulation packets are sent to this backend. The imported source includes no ML inference endpoint; do not label its pressure controller as trained ML.

## Important direct-mode semantics

The firmware defaults BOOT_DIRECT=true, so sensors are not read. The upstream TrafficSim replaces DIRECT telemetry with simulated queues, mode SIM and sim:true, while preserving measured LED la/lb values. The integrated UI explicitly distinguishes real LED state from simulated queue estimates. Backend simulation and CivixFlow animation are separate simulations; do not mix their metrics or imply that one is an observation of the other.

Follow Arduino signals is optional. A groups virtual N/S; B groups E/W. The existing four-way animation is an illustrative projection of the physical two-approach board. The server does not advance the browser physics; fixed-step car movement remains in requestAnimationFrame, with cached/interpolated rendering. Updates are compact state snapshots, not car-coordinate packets.

When board-follow is selected, Intersection.externalSignals overrides the local signal state machine and manual overrides. The local adaptive/emergency managers do not change board-follow signals. Loss of fresh telemetry (1.5 seconds), missing device boot or conflicting go signals holds virtual signals all-red. This safeguard never sends new physical commands. The separate physical control buttons send actual firmware commands and display ACK outcomes. Returning to local mode clears virtual overrides and starts with clearance.

## Backend adaptations made

- Converted sibling imports to package-relative imports; tests import backend explicitly.
- Replaced import-time database/serial creation with build_app factory, keeping create_app(link,store,sim) injectable for tests.
- Mounted the primary frontend directly, rather than hardware repo frontend/dist.
- Added initial WebSocket state/config/fresh telemetry so the dashboard works when opened after boot. Added telemetry_age separately from last-any-packet age.
- Added lifespan cleanup: cancel status task, stop serial thread, flush/end SQLite session and close the database. Serial retries now respond to the stop event and shutdown closes the port.
- Bounded unterminated serial input; retained USB detection, command whitelist, ACK behavior, automatic retries, reboot LED restoration, upstream queue simulation and remote.
- Added malformed command validation and same-origin checks on browser command/WebSocket requests. Trusted same-hotspot clients still work; no account authentication was added.
- Guarded event/command buffer updates with the existing Store lock and flushed before session replacement.

The original 60 hardware tests pass before and after these adaptations; new integration tests supplement them. No hardware was flashed, no wiring changed and physical USB/phone connectivity was not verified on a board.

## Next real-device validation

Run start.bat, connect laptop to hotspot, flash the supplied sketch deliberately if needed, close Serial Monitor and plug in USB. Verify detected COM port, BOOT/config, fresh la/lb, each physical command's ACK, /remote from the phone and the board-follow display. Unplug/replug USB and briefly remove Wi-Fi: hardware controls must disable when stale, virtual signals must hold red in board-follow and default local simulation must keep moving. Verify automatic-mode calibration only with the intended sensors/card setup from the wiring guide.

Use npm test and python -m pytest tests -q after changes. Package with python scripts/package.py. The portable ZIP intentionally excludes unrelated old adapters/ML modules and all runtime data. The macOS/Linux launcher is supplied but unverified on those OSes.
