"""CivixFlow primary frontend with the Ai-traffic USB/hotspot backend."""
import argparse
import json
from urllib.request import urlopen
import os
import socket
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def lan_addresses():
    found = []
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as connection:
            connection.connect(('8.8.8.8',80))
            found.append(connection.getsockname()[0])
    except OSError:
        pass
    try:
        found.extend(info[4][0] for info in socket.getaddrinfo(socket.gethostname(),None,socket.AF_INET))
    except OSError:
        pass
    return [ip for ip in dict.fromkeys(found) if not ip.startswith('127.')]



def reserve_http_socket(host, port):
    """Own the port before opening a browser or starting any serial workers."""
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        if os.name == 'nt':
            listener.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        else:
            listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        listener.bind((host, port))
        listener.listen(128)
        listener.setblocking(False)
        return listener
    except OSError as error:
        listener.close()
        raise SystemExit(
            f'Cannot start CivixFlow on {host}:{port}: {error}\n'
            'No browser was opened. Stop the existing server with Ctrl+C, '
            'or use python run.py --port 8001.'
        ) from error


def wait_for_dashboard(url, expected_pid):
    """Open only this process's CivixFlow app, never an older listener."""
    for _ in range(100):
        try:
            with urlopen(url + '/api/app', timeout=.5) as response:
                identity = json.load(response)
            if identity.get('dashboard') == 'civixflow' and identity.get('pid') == expected_pid:
                webbrowser.open(url)
                return
        except (OSError, ValueError):
            pass
        threading.Event().wait(.2)
    print('CivixFlow did not become ready; no browser was opened. Check the server output.', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port',default='8000',help='HTTP port (default 8000); also accepts the legacy USB port override')
    parser.add_argument('--serial-port','--arduino-port',dest='serial_port',help='Override Arduino port, e.g. COM5; otherwise auto-detected')
    parser.add_argument('--host',default='0.0.0.0',help='Use 0.0.0.0 for phone hotspot access or 127.0.0.1 for laptop only')
    parser.add_argument('--no-browser',action='store_true')
    args=parser.parse_args()
    if args.port.isdigit():
        args.port = int(args.port)
        if not 1 <= args.port <= 65535:
            parser.error('HTTP port must be between 1 and 65535')
    else:
        # Preserve upstream's python run.py --port COM5 invocation.
        args.serial_port = args.serial_port or args.port
        args.port = 8000
    if args.serial_port:
        os.environ['TRAFFIC_PORT']=args.serial_port
    if not (ROOT/'dashboard/assets/vendor/tailwind.css').is_file():
        parser.error('Frontend assets missing. Run npm ci and npm run build once.')
    os.environ.setdefault('TRAFFIC_DB',str(ROOT/'data/trafficmind.db'))
    listener = reserve_http_socket(args.host, args.port)
    browser_host = '127.0.0.1' if args.host in ('0.0.0.0', 'localhost') else args.host
    url = f'http://{browser_host}:{args.port}'
    print(f'CivixFlow dashboard: {url}', flush=True)
    print(f'Project folder: {ROOT}', flush=True)
    print(f'Frontend served: {ROOT / "dashboard"}', flush=True)
    if args.host != '127.0.0.1':
        for ip in lan_addresses():
            print(f'Phone remote (same hotspot): http://{ip}:{args.port}/remote', flush=True)
    if not args.no_browser:
        threading.Thread(target=wait_for_dashboard, args=(url, os.getpid()), daemon=True).start()
    import uvicorn
    try:
        config = uvicorn.Config('backend.main:build_app', factory=True, host=args.host, port=args.port, ws_max_size=65536)
        uvicorn.Server(config).run(sockets=[listener])
    finally:
        listener.close()



if __name__=='__main__':
    main()
