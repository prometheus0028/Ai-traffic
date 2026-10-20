"""Bounded HTTP performance measurements for read-only CivixFlow endpoints."""
from __future__ import annotations
import json, math, os, statistics, threading, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import pytest, requests
BASE_URL = os.environ.get("TRAFFICMIND_URL", "http://127.0.0.1:8000").rstrip("/")
REQUESTS_PER_ENDPOINT = int(os.environ.get("PERF_REQUESTS", "100"))
CONCURRENCY = int(os.environ.get("PERF_CONCURRENCY", "5"))
TIMEOUT_S = float(os.environ.get("PERF_TIMEOUT_S", "10"))
MAX_AVG_MS = float(os.environ.get("PERF_MAX_AVG_MS", "200"))
MAX_P95_MS = float(os.environ.get("PERF_MAX_P95_MS", "500"))
MAX_MS = float(os.environ.get("PERF_MAX_MS", "2000"))
MIN_SUCCESS_RATE = float(os.environ.get("PERF_MIN_SUCCESS_RATE", "0.99"))
MAX_SAFE_CONCURRENCY, MAX_SAFE_REQUESTS = 50, 2000
REPORTS = Path(os.environ.get("TEST_REPORTS_DIR", "reports"))
ENDPOINTS = [("/", "text/html"), ("/api/app", "application/json"), ("/api/status", "application/json"),
             ("/api/history?seconds=120", "application/json"), ("/api/events?limit=20", "application/json")]
_thread_local = threading.local()

def _session() -> requests.Session:
    if not hasattr(_thread_local, "session"): _thread_local.session = requests.Session()
    return _thread_local.session

def _one_request(path: str, expected_type: str) -> dict:
    started = time.perf_counter()
    try:
        response = _session().get(f"{BASE_URL}{path}", timeout=TIMEOUT_S); _ = response.content
        elapsed = (time.perf_counter() - started) * 1000
        content_type = response.headers.get("Content-Type", "").lower()
        expected = expected_type in content_type
        return {"elapsed_ms": elapsed, "status": response.status_code, "valid": 200 <= response.status_code < 300 and expected,
                "error": None if expected else f"Unexpected content type: {content_type}"}
    except requests.RequestException as exc:
        return {"elapsed_ms": (time.perf_counter() - started) * 1000, "status": None, "valid": False, "error": type(exc).__name__}

def _nearest_rank(values: list[float], percentile: float) -> float:
    ordered = sorted(values)
    return ordered[max(1, math.ceil(percentile / 100 * len(ordered))) - 1]

@pytest.fixture(scope="module")
def summary_results():
    if not 1 <= CONCURRENCY <= MAX_SAFE_CONCURRENCY: pytest.exit(f"PERF_CONCURRENCY must be 1..{MAX_SAFE_CONCURRENCY}", returncode=2)
    if not 1 <= REQUESTS_PER_ENDPOINT <= MAX_SAFE_REQUESTS: pytest.exit(f"PERF_REQUESTS must be 1..{MAX_SAFE_REQUESTS}", returncode=2)
    try:
        response = requests.get(f"{BASE_URL}/api/app", timeout=TIMEOUT_S); response.raise_for_status()
        assert response.json().get("dashboard") == "civixflow"
    except (requests.RequestException, ValueError, AssertionError) as exc:
        pytest.fail(f"CivixFlow service is not reachable or identity is wrong at {BASE_URL}: {exc}", pytrace=False)
    results = []
    yield results
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "performance_summary.json").write_text(json.dumps({"base_url": BASE_URL,
        "requests_per_endpoint": REQUESTS_PER_ENDPOINT, "concurrency": CONCURRENCY,
        "thresholds": {"min_success_rate": MIN_SUCCESS_RATE, "max_avg_ms": MAX_AVG_MS, "max_p95_ms": MAX_P95_MS, "max_ms": MAX_MS},
        "results": results}, indent=2), encoding="utf-8")

@pytest.mark.performance
@pytest.mark.parametrize(("path", "expected_type"), ENDPOINTS)
def test_endpoint_response_time(path: str, expected_type: str, summary_results: list[dict], record_property) -> None:
    _one_request(path, expected_type)  # warm-up request, intentionally not counted
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        samples = list(pool.map(lambda _: _one_request(path, expected_type), range(REQUESTS_PER_ENDPOINT)))
    times = [s["elapsed_ms"] for s in samples]; successes = [s for s in samples if s["valid"]]
    item = {"path": path, "requests": REQUESTS_PER_ENDPOINT, "concurrency": CONCURRENCY,
            "successes": len(successes), "success_rate": len(successes) / REQUESTS_PER_ENDPOINT,
            "avg_ms": statistics.fmean(times), "p95_ms": _nearest_rank(times, 95), "max_ms": max(times), "min_ms": min(times),
            "failures": [s["error"] or f"HTTP {s['status']}" for s in samples if not s["valid"]]}
    summary_results.append(item)
    for key in ("requests", "concurrency", "success_rate", "avg_ms", "p95_ms", "max_ms", "min_ms"):
        value = item[key]; record_property(key, round(value, 3) if isinstance(value, float) else value)
    print(f"\n{path}: {item['requests']} requests @ concurrency {item['concurrency']} | success {item['success_rate']:.1%} | avg {item['avg_ms']:.1f} ms | p95 {item['p95_ms']:.1f} ms | max {item['max_ms']:.1f} ms | min {item['min_ms']:.1f} ms")
    problems = []
    if item["success_rate"] < MIN_SUCCESS_RATE: problems.append(f"success rate {item['success_rate']:.2%} < {MIN_SUCCESS_RATE:.2%}")
    if item["avg_ms"] > MAX_AVG_MS: problems.append(f"average {item['avg_ms']:.1f} ms > {MAX_AVG_MS} ms")
    if item["p95_ms"] > MAX_P95_MS: problems.append(f"p95 {item['p95_ms']:.1f} ms > {MAX_P95_MS} ms")
    if item["max_ms"] > MAX_MS: problems.append(f"maximum {item['max_ms']:.1f} ms > {MAX_MS} ms")
    assert not problems, f"{path} exceeded performance criteria: " + "; ".join(problems)
