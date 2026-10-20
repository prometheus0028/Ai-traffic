import os
import sys
import time
import urllib.error
import urllib.request

BASE_URL = os.environ.get("TRAFFICMIND_URL", "http://127.0.0.1:8000").rstrip("/")

TIMEOUT_SECONDS = 60
RETRY_INTERVAL = 2
deadline = time.monotonic() + TIMEOUT_SECONDS

print(f"Waiting for application at {BASE_URL}", flush=True)

while time.monotonic() < deadline:
    try:
        request = urllib.request.Request(
            BASE_URL + "/", headers={"User-Agent": "Jenkins-readiness-check"}
        )

        with urllib.request.urlopen(request, timeout=3) as response:
            if 200 <= response.status < 400:
                print(f"Application ready: HTTP {response.status}", flush=True)
                sys.exit(0)

            print(f"Application returned HTTP {response.status}", flush=True)

    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        print(f"Not ready yet: {exc}", flush=True)

    time.sleep(RETRY_INTERVAL)

print(
    f"ERROR: Application did not become ready within "
    f"{TIMEOUT_SECONDS} seconds at {BASE_URL}",
    file=sys.stderr,
    flush=True,
)
sys.exit(1)
