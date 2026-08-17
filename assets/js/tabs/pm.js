import { el } from '../router.js';
import { parseDateOnly } from '../data.js';
import { fmtDate, badgeFor, breadcrumb, table, emptyState, sectionTitle } from './common.js';

function pct(dateStr, start, end) {
  const d = parseDateOnly(dateStr);
  if (!d || !start || !end || end <= start) return 0;
  const p = (d.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  return Math.min(100, Math.max(0, p * 100));
}

function renderGantt(container, plan) {
  const schedule = plan.schedule || {};
  const releases = plan.releases || [];
  const start = parseDateOnly(schedule.build_start);
  const lastReleaseEnd = releases.reduce((max, r) => {
    const e = parseDateOnly(r.ends_on);
    return e && (!max || e > max) ? e : max;
  }, null);
  const demo = parseDateOnly(schedule.demo_day);
  const end = [lastReleaseEnd, demo].filter(Boolean).sort((a, b) => b - a)[0];

  if (!start || !end || releases.length === 0) {
    container.appendChild(emptyState('No schedule to chart', 'plan.schedule or plan.releases is missing.'));
    return;
  }

  container.appendChild(el('div', { class: 'gk-gantt-axis' }, [
    el('div', {}, ''),
    el('div', {}, `${fmtDate(schedule.build_start)}  →  demo day ${fmtDate(schedule.demo_day)}`),
  ]));

  const gantt = el('div', { class: 'gk-gantt' });
  releases.forEach((r) => {
    const left = pct(r.starts_on, start, end);
    const width = Math.max(1, pct(r.ends_on, start, end) - left);
    const track = el('div', { class: 'gk-gantt-track' });
    track.appendChild(el('a', {
      href: `#/pm/release/${r.key}`,
      class: 'gk-gantt-bar' + (r.is_demo_target ? ' is-demo' : ''),
      style: `left:${left}%;width:${width}%`,
      title: `${r.name}: ${fmtDate(r.starts_on)} → ${fmtDate(r.ends_on)}`,
    }, ''));
    gantt.appendChild(el('div', { class: 'gk-gantt-row' }, [
      el('div', {}, `${r.key} — ${r.name}`),
      track,
    ]));
  });
  container.appendChild(gantt);
}

function slippageNote(s) {
  const due = parseDateOnly(s.due_on);
  const base = parseDateOnly(s.due_baseline_on);
  if (!due || !base) return '—';
  const diffDays = Math.round((due.getTime() - base.getTime()) / 86400000);
  if (diffDays === 0) return 'No slippage';
  return diffDays > 0 ? `Slipped ${diffDays}d` : `Pulled in ${-diffDays}d`;
}

export function renderPM(container, ctx) {
  const { bundle, params } = ctx;
  const { plan, stories, storiesById } = bundle;

  if (params && params.length) {
    if (params[0] === 'release' && params[1]) {
      renderReleaseDetail(container, ctx, params[1]);
      return;
    }
    renderStoryDetail(container, ctx, params[0]);
    return;
  }

  container.appendChild(el('h1', { class: 'gk-tab-title' }, 'Project management'));
  container.appendChild(el('p', { class: 'gk-tab-sub' }, 'Releases as a Gantt view, every task below it. Click a bar or a row to drill in.'));

  container.appendChild(sectionTitle('Releases'));
  renderGantt(container, plan);

  container.appendChild(sectionTitle('Every task'));
  container.appendChild(table(
    ['Story', 'Title', 'Release', 'Due', 'Baseline due', 'Slippage', 'Status'],
    stories.map((s) => [
      el('td', {}, el('a', { href: `#/pm/${s.id}` }, s.id)),
      el('td', {}, el('a', { href: `#/pm/${s.id}` }, s.title)),
      el('td', {}, s.release),
      el('td', {}, fmtDate(s.due_on)),
      el('td', {}, fmtDate(s.due_baseline_on)),
      el('td', {}, slippageNote(s)),
      el('td', {}, badgeFor(s.verification.state)),
    ]),
  ));
}

function renderReleaseDetail(container, ctx, key) {
  const { bundle } = ctx;
  const { plan, storiesById } = bundle;
  const r = (plan.releases || []).find((x) => x.key === key);
  container.appendChild(breadcrumb('pm', 'Project management', `release / ${key}`));
  if (!r) {
    container.appendChild(emptyState('Release not found', `No release with key "${key}".`));
    return;
  }
  container.appendChild(el('h1', { class: 'gk-tab-title' }, `${r.key} — ${r.name}`));
  container.appendChild(el('p', { class: 'gk-tab-sub' }, `${fmtDate(r.starts_on)} → ${fmtDate(r.ends_on)}${r.is_demo_target ? ' · demo target' : ''}`));
  const grid = el('div', { class: 'gk-card-grid' });
  (r.story_ids || []).forEach((id) => {
    const s = storiesById.get(id);
    if (!s) return;
    grid.appendChild(el('a', { href: `#/pm/${id}`, class: 'gk-card' }, [
      el('h3', {}, `${s.id} — ${s.title}`),
      badgeFor(s.verification.state),
    ]));
  });
  container.appendChild(grid);
}

function renderStoryDetail(container, ctx, id) {
  const { bundle } = ctx;
  const { storiesById } = bundle;
  const s = storiesById.get(id);
  container.appendChild(breadcrumb('pm', 'Project management', id));
  if (!s) {
    container.appendChild(emptyState('Story not found', `No story with id "${id}" in plan.json.`));
    return;
  }
  container.appendChild(el('h1', { class: 'gk-tab-title' }, `${s.id} — ${s.title}`));
  container.appendChild(el('p', { class: 'gk-tab-sub' }, s.narrative));

  const meta = el('div', { class: 'gk-tiles' });
  meta.appendChild(el('div', { class: 'gk-tile' }, [el('div', { class: 'gk-tile-label' }, 'Status'), el('div', {}, badgeFor(s.verification.state))]));
  meta.appendChild(el('div', { class: 'gk-tile' }, [el('div', { class: 'gk-tile-label' }, 'Release'), el('div', { class: 'gk-tile-value' }, s.release)]));
  meta.appendChild(el('div', { class: 'gk-tile' }, [el('div', { class: 'gk-tile-label' }, 'Owner'), el('div', { class: 'gk-tile-value' }, s.owner || '—')]));
  meta.appendChild(el('div', { class: 'gk-tile' }, [el('div', { class: 'gk-tile-label' }, 'Points'), el('div', { class: 'gk-tile-value' }, String(s.points || 0))]));
  container.appendChild(meta);

  container.appendChild(sectionTitle('Dates'));
  container.appendChild(el('p', {}, `Due: ${fmtDate(s.due_on)}  ·  Baseline due (when first set): ${fmtDate(s.due_baseline_on)}  ·  ${slippageNote(s)}`));
  if (s.verification.commit) {
    container.appendChild(el('p', {}, `Verified at commit ${s.verification.commit}`));
  }

  container.appendChild(sectionTitle('Acceptance criteria'));
  const rows = (s.progressCriteria || []).map((c) => [
    el('td', {}, c.text),
    el('td', {}, c.passed ? el('span', { class: 'gk-badge gk-badge-verified' }, 'Passed') : el('span', { class: 'gk-badge gk-badge-not_started' }, 'Not yet')),
  ]);
  if (rows.length === 0) {
    container.appendChild(emptyState('No criteria recorded', 'progress.json has no criteria for this story yet.'));
  } else {
    container.appendChild(table(['Criterion', 'Passed'], rows));
  }
}
