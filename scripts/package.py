"""Package the primary local frontend and actual USB/hotspot hardware backend."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(__file__).resolve().parents[1]
output=root/'release'/'CivixFlow-Hardware.zip'
output.parent.mkdir(exist_ok=True)
files=['run.py','start.bat','start.ps1','start.sh','requirements.txt','requirements-dev.txt',
       'README.md','INTEGRATION_HANDOFF.md','THIRD_PARTY_NOTICES.md','package.json','package-lock.json',
       'tailwind.config.cjs','scripts/package.py','scripts/build-assets.mjs',
       *['tests/'+name for name in ['test_main.py','test_protocol.py','test_serial_link.py','test_stats.py','test_store.py','test_traffic_sim.py','test_civix_integration.py','test_startup.py','conftest.py','simulation.test.mjs','hardwareState.test.mjs']],
       'docs/CivixFlow-README.md','docs/HARDWARE_WIRING_AND_SETUP.md','docs/HARDWARE_UPSTREAM_README.md']
with ZipFile(output,'w',ZIP_DEFLATED) as archive:
    for folder in ['dashboard','backend','traffic_controller']:
        for path in sorted((root/folder).rglob('*')):
            if path.is_file() and '__pycache__' not in path.parts and '.pytest_cache' not in path.parts and path.suffix!='.pyc':
                archive.write(path,'CivixFlow-Hardware/'+path.relative_to(root).as_posix())
    for name in files:
        archive.write(root/name,'CivixFlow-Hardware/'+name)
print(f'{output} ({output.stat().st_size/1024/1024:.2f} MB)')
