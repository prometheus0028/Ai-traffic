# Third-party sources

Frontend adapted from [AryanKo/CivixFlow](https://github.com/AryanKo/CivixFlow), commit `6878f8cadc327b0c548e412a578aa59ae1da22da`. Original author: Aryan. Its package metadata declares the MIT license. The upstream README is retained in `docs/CivixFlow-README.md`.

The local frontend assets bundle Tailwind CSS, Chart.js and Lucide. Their license files are included alongside the assets in `dashboard/assets/vendor/`. Dependency versions and transitive dependencies are recorded in `package-lock.json`.

The original hardware protocol, firmware and tests are preserved; adaptation details are documented in INTEGRATION_HANDOFF.md.

## Actual hardware backend and firmware

Imported from https://github.com/yubair69/Ai-traffic, commit 51dce2431a7c6c757df429cd163112ffe35add00. Its backend, serial protocol, remote page, tests and Arduino firmware are retained with attribution. Package/import, lifecycle and frontend integration changes are documented in INTEGRATION_HANDOFF.md. The original hardware README and wiring guide are in docs/HARDWARE_UPSTREAM_README.md and docs/HARDWARE_WIRING_AND_SETUP.md.
