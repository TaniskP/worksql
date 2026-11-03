// The one-line status banner ("Sandbox slow, investigating."). Shown on every page while it's set.
// Set it from /admin (with ADMIN_TOKEN), by editing data/status.json on the server, or with STATUS_MESSAGE.
const fs = require('node:fs');
const path = require('node:path');

const FILE = process.env.STATUS_FILE || path.join(__dirname, '..', 'data', 'status.json');
const LEVELS = new Set(['info', 'warn', 'down']);

function get() {
  if (process.env.STATUS_MESSAGE) return { message: process.env.STATUS_MESSAGE, level: 'warn', at: null };
  try {
    const s = JSON.parse(fs.readFileSync(FILE, 'utf8').replace(/^﻿/, '')); // Notepad saves with a BOM
    return s && s.message ? { message: String(s.message), level: LEVELS.has(s.level) ? s.level : 'info', at: s.at || null } : null;
  } catch { return null; }
}

// An empty message clears the banner.
function set({ message, level = 'info' }) {
  const text = String(message || '').trim().slice(0, 200);
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(text ? { message: text, level: LEVELS.has(level) ? level : 'info', at: Date.now() } : {}, null, 2));
  return get();
}

module.exports = { get, set };
