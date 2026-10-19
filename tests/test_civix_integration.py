import time
from fastapi.testclient import TestClient
from backend.main import create_app
from backend.store import Store
from backend.serial_link import SerialLink


class Link:
    connected = True
    port_name = 'COM9'
    parse_errors = 0
    last_packet_at = None
    boot_at = None
    _on_message = None
    stopped = False

    def __init__(self):
        self.sent = []

    def start(self):
        pass

    def stop(self):
        self.stopped = True

    def pps(self):
        return 10

    def send_command(self, cmd):
        self.sent.append(cmd)
        return {'ok':True,'ack':{'type':'ack','cmd':cmd.split(':')[0]}}


def boot():
    return {'type':'evt','ms':0,'ev':'BOOT','direct':1,'carMm':70,'lineA':0,'lineB':0}


def tel():
    return {'type':'tel','ms':100,'mode':'DIRECT','la':0,'lb':1,'emg':'-'}


def test_primary_frontend_remote_and_private_files(tmp_path):
    link = Link()
    with TestClient(create_app(link, Store(str(tmp_path/'db.sqlite')))) as client:
        page = client.get('/')
        assert page.status_code == 200
        assert 'CivixFlow' in page.text and 'signalSource' in page.text
        assert client.get('/assets/vendor/chart.umd.js').status_code == 200
        assert client.get('/remote').status_code == 200
        assert client.get('/backend/main.py').status_code == 404
        assert client.get('/trafficmind_brain.py').status_code == 404
    assert link.stopped


def test_actual_websocket_snapshot_and_ack_command(tmp_path):
    link = Link()
    app = create_app(link,Store(str(tmp_path/'db.sqlite')))
    with TestClient(app) as client:
        link.boot_at = time.time()
        link._on_message(boot())
        link._on_message(tel())
        with client.websocket_connect('/ws') as ws:
            assert ws.receive_json()['kind']=='link'
            assert ws.receive_json()['data']['ev']=='BOOT'
            result=ws.receive_json()
            assert result['kind']=='tel' and result['data']['sim'] is True
            assert result['data']['la']==0 and result['data']['lb']==1
        response=client.post('/api/command',json={'cmd':'L:10'})
        assert response.json()['ack']['cmd']=='L'
        assert link.sent==['L:10']
        assert client.get('/api/status').json()['link']['telemetry_age'] < 1.5


def test_commands_reject_malformed_and_foreign_origin(tmp_path):
    link=Link()
    with TestClient(create_app(link,Store(str(tmp_path/'db.sqlite')))) as client:
        for body in [[], {'cmd':[]}, {'cmd':1}]:
            assert client.post('/api/command',json=body).status_code==400
        assert client.post('/api/command',content='bad').status_code==400
        assert client.post('/api/command',json={'cmd':'L:11'},headers={'Origin':'https://other.example'}).status_code==403
        assert link.sent==[]


def test_serial_shutdown_releases_port():
    class Port:
        closed=False
        def close(self):
            self.closed=True
    link=SerialLink(lambda _:None)
    port=Port()
    link._ser=port
    link.stop()
    assert port.closed and link._stop.is_set()
