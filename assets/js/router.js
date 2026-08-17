import { getMode, setMode, onModeChange, currentBundle } from './state.js';
import { formatAbsoluteDate, formatRelativeAge, isStale } from './data.js';
import { renderOverview } from './tabs/overview.js';
import { renderOutcomes } from './tabs/outcomes.js';
import { renderUsers } from './tabs/users.js';
import { renderGuardrails } from './tabs/guardrails.js';
import { renderSystems } from './tabs/systems.js';
import { renderPM } from './tabs/pm.js';
import { renderAgents } from './tabs/agents.js';
import { renderKB } from './tabs/kb.js';
import { renderDataModel } from './tabs/dataModel.js';

export const TABS = [
  { key: 'overview', label: 'Overview', render: renderOverview },
  { key: 'outcomes', label: 'Outcomes', title: 'Outcomes — the numbers this has to move', render: renderOutcomes },
  { key: 'users', label: 'Users & use case', title: 'Users and use case', render: renderUsers },
  { key: 'guardrails', label: 'Guardrails', title: 'Guardrails — what must never happen', render: renderGuardrails },
  { key: 'systems', label: 'Systems', title: 'Systems — what this connects to', render: renderSystems },
  { key: 'pm', label: 'Project management', title: 'Project management', render: renderPM },
  { key: 'agents', label: 'AI agents', title: 'AI agents', render: renderAgents },
  { key: 'kb', label: 'Knowledge base', title: 'Knowledge base', render: renderKB },
  { key: 'data-model', label: 'Data model', title: 'Data model', render: renderDataModel },
];

function parseHash() {
  const raw = (location.hash || '#/overview').replace(/^#\/?/, '');
  const [tabKey, ...rest] = raw.split('/').filter(Boolean);
  return { tabKey: tabKey || 'overview', params: rest };
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

function renderFreshness(manifest) {
  const iso = manifest?.generated_at;
  const abs = formatAbsoluteDate(iso);
  const rel = formatRelativeAge(iso);
  const stale = isStale(iso);
  const wrap = el('div', { class: 'gk-freshness' + (stale ? ' is-stale' : '') });
  wrap.textContent = `Data as of ${abs} (${rel})`;
  if (stale) {
    wrap.textContent += ' — sync from the portal to refresh';
  }
  if (!iso) {
    wrap.textContent = 'Data as of: unknown — manifest.json missing or unreadable. Sync from the portal.';
  }
  return wrap;
}

function renderHeader(root, bundle) {
  const header = el('div', { class: 'gk-header' });
  header.appendChild(el('div', { class: 'gk-brand' }, [
    'GoalKick Command Center',
    el('small', {}, 'AI-powered soccer field booking and management platform'),
  ]));

  const toggle = el('div', { class: 'gk-mode-toggle' });
  const realBtn = el('button', {}, 'Real');
  const sampleBtn = el('button', {}, 'Sample');
  const sync = () => {
    const m = getMode();
    realBtn.className = m === 'real' ? 'is-active' : '';
    sampleBtn.className = m === 'sample' ? 'is-active' : '';
  };
  realBtn.addEventListener('click', () => setMode('real'));
  sampleBtn.addEventListener('click', () => setMode('sample'));
  sync();
  toggle.appendChild(realBtn);
  toggle.appendChild(sampleBtn);
  header.appendChild(toggle);
  header.appendChild(renderFreshness(bundle?.manifest));
  root.appendChild(header);

  if (getMode() === 'sample') {
    root.appendChild(el('div', { class: 'gk-sample-banner' }, 'SAMPLE DATA — fabricated for demonstration. Not a real result.'));
  }
}

function renderNav(root, activeKey) {
  const nav = el('div', { class: 'gk-nav' });
  TABS.forEach((t) => {
    const a = el('a', { href: `#/${t.key}` }, t.label);
    if (t.key === activeKey) a.className = 'is-active';
    nav.appendChild(a);
  });
  root.appendChild(nav);
}

let appRoot = null;

export function mountRouter(root) {
  appRoot = root;
  window.addEventListener('hashchange', renderRoute);
  onModeChange(() => renderRoute());
  renderRoute();
}

export function renderRoute() {
  const { tabKey, params } = parseHash();
  const tab = TABS.find((t) => t.key === tabKey) || TABS[0];
  const bundle = currentBundle();

  appRoot.innerHTML = '';
  const app = el('div', { class: 'gk-app' });
  renderHeader(app, bundle);
  renderNav(app, tab.key);
  const main = el('main', { class: 'gk-main' });
  app.appendChild(main);
  app.appendChild(el('div', { class: 'gk-footer' }, 'GoalKick Command Center — data is "as of your last sync," not live. Re-run Sync from the portal (or push, if the webhook is registered) to refresh.'));
  appRoot.appendChild(app);

  if (!bundle || bundle.loadError) {
    main.appendChild(el('div', { class: 'gk-empty' }, [
      el('strong', {}, 'Data files not found'),
      'Could not read one or more of .colaberry/plan.json, progress.json or manifest.json. Sync from the portal to generate them.',
    ]));
    return;
  }

  try {
    tab.render(main, { bundle, mode: getMode(), params, tab, navigate });
  } catch (err) {
    main.appendChild(el('div', { class: 'gk-empty' }, [
      el('strong', {}, 'This view hit an error'),
      String(err && err.message ? err.message : err),
    ]));
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

export function navigate(path) {
  location.hash = `#/${path}`;
}

export { el };
