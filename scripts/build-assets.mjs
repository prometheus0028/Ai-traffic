import { mkdirSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
mkdirSync('dashboard/assets/vendor', { recursive: true });
execFileSync(process.execPath, ['node_modules/tailwindcss/lib/cli.js', '-c', 'tailwind.config.cjs', '-i', 'dashboard/assets/css/tailwind.css', '-o', 'dashboard/assets/vendor/tailwind.css', '--minify'], {stdio:'inherit'});
copyFileSync('node_modules/chart.js/dist/chart.umd.js', 'dashboard/assets/vendor/chart.umd.js');
copyFileSync('node_modules/lucide/dist/umd/lucide.js', 'dashboard/assets/vendor/lucide.js');
copyFileSync('node_modules/lucide/LICENSE', 'dashboard/assets/vendor/lucide-LICENSE.txt');
copyFileSync('node_modules/chart.js/LICENSE.md', 'dashboard/assets/vendor/chartjs-LICENSE.txt');
copyFileSync('node_modules/tailwindcss/LICENSE', 'dashboard/assets/vendor/tailwind-LICENSE.txt');
