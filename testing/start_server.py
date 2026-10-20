import os
import subprocess
import sys
from pathlib import Path

workspace = Path(os.environ["WORKSPACE"])
reports = workspace / "reports"
reports.mkdir(parents=True, exist_ok=True)

pid_file = reports / "server.pid"
stdout_file = reports / "server.log"
stderr_file = reports / "server.err.log"

python_exe = Path(sys.executable)
if not python_exe.exists():
    raise FileNotFoundError(f"Python executable not found: {python_exe}")

with stdout_file.open("w", encoding="utf-8") as stdout, stderr_file.open(
    "w", encoding="utf-8"
) as stderr:

    flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP

    process = subprocess.Popen(
        [
            str(python_exe),
            "-u",
            "run.py",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
            "--no-browser",
        ],
        cwd=str(workspace),
        stdin=subprocess.DEVNULL,
        stdout=stdout,
        stderr=stderr,
        creationflags=flags,
        close_fds=True,
    )

pid_file.write_text(str(process.pid), encoding="utf-8")
print(f"Detached application launch requested; PID {process.pid}", flush=True)
