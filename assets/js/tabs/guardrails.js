import { el } from '../router.js';
import { breadcrumb, emptyState, requirementEnforcement, badgeFor } from './common.js';

export function renderGuardrails(container, ctx) {
  const { bundle, params } = ctx;
  const guardrails = bundle.plan?.derived?.guardrails || [];
  const requirements = bundle.requirements || [];
  const storiesById = bundle.storiesById;

  if (params && params.length) {
    const g = guardrails.find((x) => x.id === params[0]);
    container.appendChild(breadcrumb('guardrails', 'Guardrails', params[0]));
    if (!g) {
      container.appendChild(emptyState('Guardrail not found', `No guardrail with id "${params[0]}".`));
      return;
    }
    container.appendChild(el('h1', { class: 'gk-tab-title' }, g.id));
    container.appendChild(el('p', { class: 'gk-tab-sub' }, g.statement));

    const req = requirements.find((r) => r.id === g.requirement_id);
    if (!req) {
      container.appendChild(emptyState('No requirement traced', 'This guardrail is not linked to a requirement in plan.json, so enforcement cannot be checked.'));
      return;
    }
    const check = requirementEnforcement(req, storiesById);
    container.appendChild(el('p', {}, [
      el('strong', {}, check.enforced ? 'Enforced. ' : 'Not enforced yet. '),
      check.reason + '.',
    ]));
    const grid = el('div', { class: 'gk-card-grid' });
    (req.fulfilled_by || []).forEach((id) => {
      const s = storiesById.get(id);
      if (!s) return;
      grid.appendChild(el('a', { href: `#/pm/${id}`, class: 'gk-card' }, [
        el('h3', {}, `${s.id} — ${s.title}`),
        badgeFor(s.verification.state),
      ]));
    });
    if (grid.children.length) container.appendChild(grid);
    return;
  }

  container.appendChild(el('h1', { class: 'gk-tab-title' }, 'Guardrails — what must never happen'));

  if (guardrails.length === 0) {
    container.appendChild(emptyState(
      'No guardrail defined yet',
      'Your plan has no requirement typed SAFE, which usually means a promise made in the interview was recorded as a normal feature instead. This is worth raising with your instructor before building further — it is not something this page can fix by inventing a guardrail.',
    ));
    return;
  }

  const grid = el('div', { class: 'gk-card-grid' });
  guardrails.forEach((g) => {
    const req = requirements.find((r) => r.id === g.requirement_id);
    const check = req ? requirementEnforcement(req, storiesById) : { enforced: false, reason: 'not linked to a requirement' };
    grid.appendChild(el('a', { href: `#/guardrails/${encodeURIComponent(g.id)}`, class: 'gk-card' }, [
      el('h3', {}, g.id),
      el('p', {}, g.statement),
      el('span', { class: `gk-badge ${check.enforced ? 'gk-badge-verified' : 'gk-badge-not_started'}` }, check.enforced ? 'Enforced' : 'Promise, not yet kept'),
    ]));
  });
  container.appendChild(grid);
}
