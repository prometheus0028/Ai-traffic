"""CivixFlow primary frontend with the Ai-traffic USB/hotspot backend."""
import argparse
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
    print(f'Dashboard: http://127.0.0.1:{args.port}',flush=True)
    if args.host != '127.0.0.1':
        for ip in lan_addresses():
            print(f'Phone remote (same hotspot): http://{ip}:{args.port}/remote',flush=True)
    if not args.no_browser:
        def open_when_ready():
            for _ in range(100):
                try:
                    with socket.create_connection(('127.0.0.1',args.port),timeout=.2):
                        webbrowser.open(f'http://127.0.0.1:{args.port}')
                        return
                except OSError:
                    threading.Event().wait(.2)
        threading.Thread(target=open_when_ready,daemon=True).start()
    import uvicorn
    uvicorn.run('backend.main:build_app',factory=True,host=args.host,port=args.port,ws_max_size=65536)


if __name__=='__main__':
    main()
