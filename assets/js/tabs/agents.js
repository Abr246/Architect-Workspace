import { el } from '../router.js';
import { breadcrumb, emptyState, badgeFor } from './common.js';

function groupByOwner(stories) {
  const map = new Map();
  stories.forEach((s) => {
    const owner = s.owner || 'Unassigned';
    if (!map.has(owner)) map.set(owner, []);
    map.get(owner).push(s);
  });
  return map;
}

export function renderAgents(container, ctx) {
  const { bundle, params } = ctx;
  const owners = groupByOwner(bundle.stories || []);
  const runs = bundle.plan?.derived?.sampleAgentRuns || {};
  const skills = bundle.plan?.derived?.sampleAgentSkills || {};

  if (params && params.length) {
    const owner = decodeURIComponent(params[0]);
    const ownedStories = owners.get(owner) || [];
    container.appendChild(breadcrumb('agents', 'AI agents', owner));
    container.appendChild(el('h1', { class: 'gk-tab-title' }, owner));
    container.appendChild(el('p', { class: 'gk-tab-sub' }, 'This is a story owner, not a scoped AI agent — no agent roster is defined in the plan yet.'));

    const run = runs[owner];
    container.appendChild(el('p', {}, run
      ? `${run.runs_7d} runs in the last 7 days · ${Math.round(run.success_rate * 100)}% success · last run ${new Date(run.last_run).toLocaleString()}`
      : 'No runs recorded.'));

    const skillList = skills[owner];
    container.appendChild(el('p', {}, skillList && skillList.length ? `Skills: ${skillList.join(', ')}` : 'No skills registered yet.'));

    const grid = el('div', { class: 'gk-card-grid' });
    ownedStories.forEach((s) => {
      grid.appendChild(el('a', { href: `#/pm/${s.id}`, class: 'gk-card' }, [
        el('h3', {}, `${s.id} — ${s.title}`),
        badgeFor(s.verification.state),
      ]));
    });
    container.appendChild(grid);
    return;
  }

  container.appendChild(el('h1', { class: 'gk-tab-title' }, 'AI agents'));
  container.appendChild(el('p', { class: 'gk-tab-sub' }, 'Your plan does not carry a scoped agent roster yet, so this is built from who owns each story — owners, not scoped agents.'));

  if (owners.size === 0) {
    container.appendChild(emptyState('No stories to derive owners from', 'plan.stories is empty.'));
    return;
  }

  const grid = el('div', { class: 'gk-card-grid' });
  owners.forEach((list, owner) => {
    const run = runs[owner];
    grid.appendChild(el('a', { href: `#/agents/${encodeURIComponent(owner)}`, class: 'gk-card' }, [
      el('h3', {}, owner),
      el('p', {}, `Owns ${list.map((s) => s.id).join(', ')}`),
      el('p', {}, run ? `${run.runs_7d} runs / 7d · ${Math.round(run.success_rate * 100)}% success` : 'No runs recorded'),
    ]));
  });
  container.appendChild(grid);
}
