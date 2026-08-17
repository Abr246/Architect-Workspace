import { el } from '../router.js';
import { breadcrumb, emptyState } from './common.js';

export function renderOutcomes(container, ctx) {
  const { bundle, params, mode } = ctx;
  const measures = bundle.plan?.derived?.measures || [];

  if (params && params.length) {
    const m = measures.find((x) => x.id === params[0]);
    container.appendChild(breadcrumb('outcomes', 'Outcomes', params[0]));
    if (!m) {
      container.appendChild(emptyState('Measure not found', `No measure with id "${params[0]}" in the current dataset.`));
      return;
    }
    container.appendChild(el('h1', { class: 'gk-tab-title' }, m.id));
    container.appendChild(el('p', { class: 'gk-tab-sub' }, m.statement));
    container.appendChild(emptyState('No linkage tracked yet', 'plan.json does not yet record which requirements or stories move this measure. That linkage is future work.'));
    return;
  }

  container.appendChild(el('h1', { class: 'gk-tab-title' }, 'Outcomes — the numbers this has to move'));

  if (measures.length === 0) {
    container.appendChild(emptyState(
      'No numeric target defined yet',
      mode === 'sample'
        ? 'Sample mode is on but returned no measures — check assets/js/sampleData.js.'
        : 'Your plan carries no numeric outcome measures yet. This is expected on day one — as measures get defined in the plan, they will appear here automatically, one card per measure. Nothing is invented to fill this space.',
    ));
    return;
  }

  const grid = el('div', { class: 'gk-card-grid' });
  measures.forEach((m) => {
    grid.appendChild(el('a', { href: `#/outcomes/${encodeURIComponent(m.id)}`, class: 'gk-card' }, [
      el('h3', {}, m.id),
      el('p', {}, m.statement),
    ]));
  });
  container.appendChild(grid);
}
