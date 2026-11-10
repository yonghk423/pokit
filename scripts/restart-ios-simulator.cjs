// Recover development reload deadlocks without rebuilding or deleting app data.
const { spawnSync } = require('node:child_process');
const bundleId = 'com.yonghee.pokit';
const devices = spawnSync('xcrun', ['simctl', 'list', 'devices', 'booted', '--json'], { encoding: 'utf8' });
if (devices.status !== 0) {
  console.error(devices.stderr || 'Cannot inspect booted simulators.');
  process.exit(1);
}
const booted = Object.values(JSON.parse(devices.stdout).devices).flat().filter(device => device.state === 'Booted');
if (booted.length !== 1) {
  console.error('Open exactly one simulator before restarting the app.');
  process.exit(1);
}
const device = booted[0].udid;
spawnSync('xcrun', ['simctl', 'terminate', device, bundleId], { encoding: 'utf8' });
const result = spawnSync('xcrun', ['simctl', 'launch', device, bundleId], { stdio: 'inherit' });
process.exit(result.status ?? 1);
