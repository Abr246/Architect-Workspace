import { el } from '../router.js';
import { parseDateOnly } from '../data.js';

export function fmtDate(dateStr) {
  const d = parseDateOnly(dateStr);
  if (!d) return 'unknown';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function badgeFor(state) {
  const label = { verified: 'Verified', submitted: 'Submitted', in_progress: 'In progress', not_started: 'Not started' }[state] || state;
  return el('span', { class: `gk-badge gk-badge-${state}` }, label);
}

export function statusDot(status) {
  const cls = { good: 'gk-dot-good', critical: 'gk-dot-critical' }[status] || 'gk-dot-grey';
  return el('span', { class: `gk-dot ${cls}` });
}

export function emptyState(title, body) {
  return el('div', { class: 'gk-empty' }, [
    el('strong', {}, title),
    body,
  ]);
}

export function breadcrumb(tabKey, tabLabel, trail) {
  const parts = [el('a', { href: `#/${tabKey}` }, tabLabel)];
  if (trail) parts.push(` / ${trail}`);
  return el('div', { class: 'gk-breadcrumb' }, parts);
}

export function table(headers, rows) {
  const t = el('table', { class: 'gk-table' });
  t.appendChild(el('thead', {}, el('tr', {}, headers.map((h) => el('th', {}, h)))));
  const tbody = el('tbody');
  rows.forEach((r) => tbody.appendChild(el('tr', {}, r)));
  t.appendChild(tbody);
  const wrap = el('div', { class: 'gk-table-wrap' });
  wrap.appendChild(t);
  return wrap;
}

export function sectionTitle(text) {
  return el('div', { class: 'gk-section-title' }, text);
}

// A requirement is "enforced" only if every story that fulfils it is verified.
export function requirementEnforcement(req, storiesById) {
  const ids = req.fulfilled_by || [];
  if (ids.length === 0) return { enforced: false, reason: 'no story covers this requirement yet' };
  const unverified = ids.filter((id) => storiesById.get(id)?.verification?.state !== 'verified');
  if (unverified.length > 0) {
    return { enforced: false, reason: `${unverified.join(', ')} not yet verified` };
  }
  return { enforced: true, reason: 'all covering stories verified' };
}

export { el };
