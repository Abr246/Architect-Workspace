import { el } from '../router.js';
import { parseDateOnly } from '../data.js';
import { fmtDate, badgeFor, breadcrumb, table, emptyState } from './common.js';

function dateOnly(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function computeSchedulePosition(schedule, releases, now) {
  if (!schedule) return { label: 'Schedule not defined', detail: 'plan.schedule is missing.' };
  const today = dateOnly(now);
  const buildStart = parseDateOnly(schedule.build_start);
  const buildEnd = parseDateOnly(schedule.build_end);
  const demoDay = parseDateOnly(schedule.demo_day);

  if (buildStart && today < buildStart) {
    return { label: 'Before build start', detail: `Build begins ${fmtDate(schedule.build_start)}.` };
  }

  const sorted = [...(releases || [])].sort((a, b) => parseDateOnly(a.starts_on) - parseDateOnly(b.starts_on));
  for (const r of sorted) {
    const s = parseDateOnly(r.starts_on);
    const e = parseDateOnly(r.ends_on);
    if (today >= s && today <= e) {
      return { label: `In ${r.name} (${r.key})`, detail: `Runs ${fmtDate(r.starts_on)} → ${fmtDate(r.ends_on)}.` };
    }
  }

  if (buildEnd && today > buildEnd && demoDay && today <= demoDay) {
    return { label: 'Demo prep week', detail: `Build ended ${fmtDate(schedule.build_end)}. Demo day is ${fmtDate(schedule.demo_day)}.` };
  }
  if (demoDay && today > demoDay) {
    return { label: 'Past demo day', detail: `Demo day was ${fmtDate(schedule.demo_day)}.` };
  }

  const next = sorted.find((r) => parseDateOnly(r.starts_on) > today);
  if (next) {
    return { label: 'Between releases', detail: `Next up: ${next.name} (${next.key}), starts ${fmtDate(next.starts_on)}.` };
  }
  return { label: 'Schedule position unclear', detail: 'Today does not fall inside any defined release window.' };
}

function tile(label, value, sub, href) {
  return el('a', { href, class: 'gk-tile' }, [
    el('div', { class: 'gk-tile-label' }, label),
    el('div', { class: 'gk-tile-value' }, String(value)),
    sub ? el('div', { class: 'gk-tile-sub' }, sub) : null,
  ]);
}

export function renderOverview(container, ctx) {
  const { bundle, params } = ctx;
  const { plan, progress } = bundle;

  if (params && params.length) {
    renderDrillDown(container, ctx, params[0]);
    return;
  }

  container.appendChild(el('h1', { class: 'gk-tab-title' }, plan?.project?.name || 'Project'));
  container.appendChild(el('p', { class: 'gk-tab-sub' }, plan?.project?.descriptor || 'No project descriptor in plan.json.'));

  const totals = progress?.totals;
  if (!totals) {
    container.appendChild(emptyState('No totals available', 'progress.json has no totals block yet.'));
    return;
  }

  const sched = computeSchedulePosition(plan?.schedule, plan?.releases, new Date());

  const tiles = el('div', { class: 'gk-tiles' });
  tiles.appendChild(tile('Stories verified', `${totals.stories_verified} / ${totals.stories_total}`, 'Click to see every story and its status', '#/overview/stories'));
  tiles.appendChild(tile('Criteria passed', `${totals.criteria_passed} / ${totals.criteria_total}`, 'Click to see every acceptance criterion', '#/overview/criteria'));
  tiles.appendChild(tile('Points awarded', totals.points_awarded, 'Click to see the per-story breakdown', '#/overview/points'));
  tiles.appendChild(tile('Schedule', sched.label, sched.detail, '#/overview/schedule'));
  container.appendChild(tiles);
}

function renderDrillDown(container, ctx, view) {
  const { bundle } = ctx;
  const { plan, stories } = bundle;

  container.appendChild(breadcrumb('overview', 'Overview', view));

  if (view === 'stories') {
    container.appendChild(el('h1', { class: 'gk-tab-title' }, 'All stories'));
    container.appendChild(table(
      ['Story', 'Title', 'Release', 'Owner', 'Status'],
      stories.map((s) => [
        el('td', {}, s.id), el('td', {}, s.title), el('td', {}, s.release), el('td', {}, s.owner || '—'), el('td', {}, badgeFor(s.verification.state)),
      ]),
    ));
    return;
  }

  if (view === 'criteria') {
    container.appendChild(el('h1', { class: 'gk-tab-title' }, 'All acceptance criteria'));
    const rows = [];
    stories.forEach((s) => {
      (s.progressCriteria || []).forEach((c) => {
        rows.push([
          el('td', {}, s.id),
          el('td', {}, c.text),
          el('td', {}, c.passed ? el('span', { class: 'gk-badge gk-badge-verified' }, 'Passed') : el('span', { class: 'gk-badge gk-badge-not_started' }, 'Not yet')),
        ]);
      });
    });
    container.appendChild(table(['Story', 'Criterion', 'Passed'], rows));
    return;
  }

  if (view === 'points') {
    container.appendChild(el('h1', { class: 'gk-tab-title' }, 'Points by story'));
    container.appendChild(table(
      ['Story', 'Title', 'Status', 'Points'],
      stories.map((s) => [
        el('td', {}, s.id), el('td', {}, s.title), el('td', {}, badgeFor(s.verification.state)), el('td', {}, String(s.points || 0)),
      ]),
    ));
    return;
  }

  if (view === 'schedule') {
    container.appendChild(el('h1', { class: 'gk-tab-title' }, 'Release schedule'));
    container.appendChild(table(
      ['Release', 'Name', 'Starts', 'Ends', 'Stories', 'Demo target'],
      (plan.releases || []).map((r) => [
        el('td', {}, r.key), el('td', {}, r.name), el('td', {}, fmtDate(r.starts_on)), el('td', {}, fmtDate(r.ends_on)),
        el('td', {}, (r.story_ids || []).join(', ')), el('td', {}, r.is_demo_target ? 'Yes' : ''),
      ]),
    ));
    container.appendChild(el('p', { class: 'gk-tab-sub' }, [
      `Demo day: ${fmtDate(plan.schedule?.demo_day)}. Full Gantt view lives on the `,
      el('a', { href: '#/pm' }, 'Project management'),
      ' tab.',
    ]));
    return;
  }

  container.appendChild(emptyState('Unknown detail view', 'This overview drill-down does not exist.'));
}
