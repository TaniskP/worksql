// Renders launch/og-card.html to public/img/og.png with a local Edge or Chrome, headless.
// node launch/render-og.js
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const browsers = [
  process.env.CHROME_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const bin = browsers.find((b) => fs.existsSync(b));
if (!bin) { console.error('No Edge or Chrome found. Set CHROME_PATH.'); process.exit(1); }

const src = path.join(__dirname, 'og-card.html');
const out = path.join(__dirname, '..', 'public', 'img', 'og.png');
execFileSync(bin, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
  '--window-size=1200,630', '--virtual-time-budget=4000', `--screenshot=${out}`, `file:///${src.replace(/\\/g, '/')}`,
], { stdio: 'inherit' });
console.log(`Wrote ${out} (${fs.statSync(out).size} bytes)`);
