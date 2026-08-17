import { loadRealData, buildFromSample } from './data.js';
import { buildSampleBundle } from './sampleData.js';
import { setBundles } from './state.js';
import { mountRouter } from './router.js';

async function boot() {
  const root = document.getElementById('app');
  try {
    const real = await loadRealData();
    const sample = buildFromSample(buildSampleBundle(real.plan));
    setBundles(real, sample);
    mountRouter(root);
  } catch (err) {
    root.innerHTML = '';
    const msg = document.createElement('div');
    msg.style.padding = '40px';
    msg.style.fontFamily = 'system-ui, sans-serif';
    msg.innerHTML = `<strong>GoalKick Command Center failed to load its data.</strong><br>${String(err && err.message ? err.message : err)}<br><br>If you opened this file directly (file://), serve it over http instead — browsers block fetch() of local JSON files from file://.`;
    root.appendChild(msg);
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

boot();
