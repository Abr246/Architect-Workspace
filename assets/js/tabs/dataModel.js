import { el } from '../router.js';
import { breadcrumb, emptyState, table, sectionTitle } from './common.js';
import { ENTITIES, RELATIONSHIPS } from '../dataModelDraft.js';

export function renderDataModel(container, ctx) {
  const { params } = ctx;

  if (params && params.length) {
    const entity = ENTITIES.find((e) => e.name === params[0]);
    container.appendChild(breadcrumb('data-model', 'Data model', params[0]));
    if (!entity) {
      container.appendChild(emptyState('Entity not found', `No draft entity named "${params[0]}".`));
      return;
    }
    container.appendChild(el('h1', { class: 'gk-tab-title' }, entity.name));
    container.appendChild(el('p', { class: 'gk-tab-sub' }, `Supports: ${entity.supports.join(', ')}`));
    container.appendChild(table(['Field', 'Type'], entity.fields.map(([f, t]) => [el('td', {}, f), el('td', {}, t)])));
    return;
  }

  container.appendChild(el('h1', { class: 'gk-tab-title' }, 'Data model'));
  container.appendChild(emptyState(
    'Draft — not yet implemented as database tables',
    'This is a starting point derived from the requirements in plan.json, for review before anything gets built from it. Nothing here is a live schema or a claim about what exists in a running database.',
  ));

  container.appendChild(sectionTitle('Entities'));
  const grid = el('div', { class: 'gk-card-grid' });
  ENTITIES.forEach((entity) => {
    grid.appendChild(el('a', { href: `#/data-model/${encodeURIComponent(entity.name)}`, class: 'gk-card' }, [
      el('h3', {}, entity.name),
      el('p', {}, `${entity.fields.length} fields · supports ${entity.supports.join(', ')}`),
    ]));
  });
  container.appendChild(grid);

  container.appendChild(sectionTitle('Relationships (draft)'));
  const ul = el('ul');
  RELATIONSHIPS.forEach((r) => ul.appendChild(el('li', {}, r)));
  container.appendChild(ul);
}
