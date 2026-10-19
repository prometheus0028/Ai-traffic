import json
import os
from urllib.request import urlopen

import pytest
import run


def test_busy_port_fails_before_opening_browser():
    with run.reserve_http_socket('127.0.0.1', 0) as existing:
        port = existing.getsockname()[1]
        with pytest.raises(SystemExit, match='No browser was opened'):
            run.reserve_http_socket('127.0.0.1', port)


def test_browser_does_not_open_for_a_different_server(monkeypatch):
    from io import BytesIO
    opened = []
    monkeypatch.setattr(run, 'urlopen', lambda *a, **k: BytesIO(json.dumps({'dashboard':'civixflow','pid':-1}).encode()))
    monkeypatch.setattr(run.webbrowser, 'open', opened.append)
    monkeypatch.setattr(run.threading, 'Event', lambda: type('NoDelay', (), {'wait':lambda self, timeout: None})())
    run.wait_for_dashboard('http://127.0.0.1:8000', os.getpid())
    assert opened == []


def test_browser_opens_for_this_civixflow_process(monkeypatch):
    from io import BytesIO
    opened = []
    monkeypatch.setattr(run, 'urlopen', lambda *a, **k: BytesIO(json.dumps({'dashboard':'civixflow','pid':os.getpid()}).encode()))
    monkeypatch.setattr(run.webbrowser, 'open', opened.append)
    run.wait_for_dashboard('http://127.0.0.1:8000', os.getpid())
    assert opened == ['http://127.0.0.1:8000']
