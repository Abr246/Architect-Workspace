import { el } from '../router.js';
import { breadcrumb, emptyState, statusDot } from './common.js';

function systemsList(bundle) {
  const names = bundle.plan?.derived?.systems || [];
  const sampleStatus = bundle.plan?.derived?.sampleSystemStatus;
  return names.map((name) => {
    const s = sampleStatus?.find((x) => x.name === name);
    return {
      name,
      status: s?.status || 'unknown',
      last_checked: s?.last_checked || null,
    };
  });
}

export function renderSystems(container, ctx) {
  const { bundle, params } = ctx;
  const systems = systemsList(bundle);

  if (params && params.length) {
    const name = decodeURIComponent(params[0]);
    const s = systems.find((x) => x.name === name);
    container.appendChild(breadcrumb('systems', 'Systems', name));
    if (!s) {
      container.appendChild(emptyState('System not found', `No system named "${name}" in plan.json.`));
      return;
    }
    container.appendChild(el('h1', { class: 'gk-tab-title' }, [statusDot(s.status), ' ', s.name]));
    container.appendChild(el('p', { class: 'gk-tab-sub' }, s.last_checked
      ? `Last checked: ${new Date(s.last_checked).toLocaleString()}`
      : 'Not checked from here.'));
    container.appendChild(emptyState(
      'This page only knows the name',
      'plan.json records that GoalKick connects to this system — nothing here confirms whether the connection is actually live right now. That fact has to come from your running system, not from a name in a JSON file.',
    ));
    return;
  }

  container.appendChild(el('h1', { class: 'gk-tab-title' }, 'Systems — what this connects to'));

  if (systems.length === 0) {
    container.appendChild(emptyState(
      'No external system named yet',
      'Your plan names no external system yet. As systems are added to the plan they will appear here, each with a grey "not checked from here" indicator until your own running system reports its state — never a colour earned just by appearing in a JSON file.',
    ));
    return;
  }

  const grid = el('div', { class: 'gk-card-grid' });
  systems.forEach((s) => {
    grid.appendChild(el('a', { href: `#/systems/${encodeURIComponent(s.name)}`, class: 'gk-card' }, [
      el('h3', {}, [statusDot(s.status), ' ', s.name]),
      el('p', {}, s.last_checked ? `Checked ${new Date(s.last_checked).toLocaleString()}` : 'Not checked from here'),
    ]));
  });
  container.appendChild(grid);
}
