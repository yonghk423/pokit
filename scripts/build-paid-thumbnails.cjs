// Compatibility entry point. Never recompress previews in place or process diary assets.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const result = spawnSync('python3', [path.join(__dirname, 'build-calendar-quality-assets.py'), ...process.argv.slice(2)], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
