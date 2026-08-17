const MODE_KEY = 'gk_mode';
let mode = localStorage.getItem(MODE_KEY) === 'sample' ? 'sample' : 'real';
const listeners = new Set();

export function getMode() {
  return mode;
}

export function setMode(next) {
  if (next !== 'real' && next !== 'sample') return;
  if (next === mode) return;
  mode = next;
  localStorage.setItem(MODE_KEY, mode);
  listeners.forEach((fn) => fn(mode));
}

export function onModeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Holds the two loaded data bundles (real + sample) once app.js fetches them.
const store = { real: null, sample: null, now: new Date() };

export function setBundles(real, sample) {
  store.real = real;
  store.sample = sample;
}

export function currentBundle() {
  return mode === 'sample' ? store.sample : store.real;
}

export function bundleFor(m) {
  return m === 'sample' ? store.sample : store.real;
}
