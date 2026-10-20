"""Wait until the CivixFlow FastAPI service is ready for automated tests."""
from __future__ import annotations
import os, sys, time
import requests
BASE_URL = os.environ.get("TRAFFICMIND_URL", "http://127.0.0.1:8000").rstrip("/")
TIMEOUT = float(os.environ.get("APP_READY_TIMEOUT_S", "45"))
deadline = time.monotonic() + TIMEOUT
last_error = "no response yet"
while time.monotonic() < deadline:
    try:
        response = requests.get(f"{BASE_URL}/api/app", timeout=2)
        response.raise_for_status()
        payload = response.json()
        if payload.get("dashboard") != "civixflow": raise RuntimeError(f"Unexpected app identity: {payload!r}")
        status = requests.get(f"{BASE_URL}/api/status", timeout=2)
        status.raise_for_status(); status.json()
        print(f"CivixFlow is ready at {BASE_URL}")
        raise SystemExit(0)
    except (requests.RequestException, ValueError, RuntimeError) as exc:
        last_error = str(exc); time.sleep(1)
print(f"CivixFlow did not become ready at {BASE_URL}: {last_error}", file=sys.stderr)
raise SystemExit(1)
