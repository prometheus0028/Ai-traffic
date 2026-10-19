#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if [ ! -f .venv/bin/python ]; then python3 -m venv .venv; fi
if [ ! -f .venv/civixflow-hardware-installed ] || [ requirements.txt -nt .venv/civixflow-hardware-installed ]; then
  .venv/bin/python -m pip install -r requirements.txt
  touch .venv/civixflow-hardware-installed
fi
exec .venv/bin/python run.py "$@"
