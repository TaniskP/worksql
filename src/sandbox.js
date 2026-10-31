// Talks to the query worker. Kills and replaces it if a query runs too long.
const path = require('node:path');
const { Worker } = require('node:worker_threads');

const TIMEOUT_MS = 3000;
let worker = null;
let seq = 0;
const pending = new Map();

function spawn() {
  worker = new Worker(path.join(__dirname, 'sandbox-worker.js'));
  worker.on('message', ({ id, result }) => {
    const p = pending.get(id);
    if (p) { clearTimeout(p.timer); pending.delete(id); p.resolve(result); }
  });
  worker.on('error', (e) => console.error('sandbox worker error:', e));
  worker.on('exit', () => {
    worker = null;
    for (const [id, p] of pending) { clearTimeout(p.timer); p.resolve({ error: 'The sandbox restarted. Run it again.' }); pending.delete(id); }
  });
}

function call(msg) {
  if (!worker) spawn();
  const id = ++seq;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve({ error: 'Query timeout expired. Your query ran for over 3 seconds. Check your JOIN conditions.' });
      if (worker) worker.terminate();
    }, TIMEOUT_MS);
    pending.set(id, { resolve, timer });
    worker.postMessage({ id, ...msg });
  });
}

module.exports = {
  run: (sql) => call({ op: 'run', sql }),
  parse: (sql) => call({ op: 'parse', sql }),
  counts: () => call({ op: 'counts' }),
  preview: (table, n = 3) => call({ op: 'preview', table, n }),
  today: () => call({ op: 'today' }),
};
