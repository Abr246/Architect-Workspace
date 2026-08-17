import { el } from '../router.js';
import { breadcrumb, emptyState, badgeFor } from './common.js';

export function renderUsers(container, ctx) {
  const { bundle, params } = ctx;
  const roles = bundle.plan?.derived?.roles || [];
  const stories = bundle.stories || [];

  if (params && params.length) {
    const role = decodeURIComponent(params[0]);
    container.appendChild(breadcrumb('users', 'Users & use case', role));
    container.appendChild(el('h1', { class: 'gk-tab-title' }, role));
    const roleStories = stories.filter((s) => s.role === role);
    if (roleStories.length === 0) {
      container.appendChild(emptyState('No stories for this role', `No story in plan.json has role "${role}".`));
      return;
    }
    const grid = el('div', { class: 'gk-card-grid' });
    roleStories.forEach((s) => {
      grid.appendChild(el('a', { href: `#/pm/${s.id}`, class: 'gk-card' }, [
        el('h3', {}, `${s.id} — ${s.title}`),
        el('p', {}, s.narrative),
        badgeFor(s.verification.state),
      ]));
    });
    container.appendChild(grid);
    return;
  }

  container.appendChild(el('h1', { class: 'gk-tab-title' }, 'Users and use case'));
  container.appendChild(el('p', { class: 'gk-tab-sub' }, 'Roles are taken directly from your stories’ "As a <role>, I want…" narratives.'));

  if (roles.length === 0) {
    container.appendChild(emptyState('No roles defined yet', 'plan.derived.roles is empty.'));
    return;
  }

  const grid = el('div', { class: 'gk-card-grid' });
  roles.forEach((role) => {
    const count = stories.filter((s) => s.role === role).length;
    grid.appendChild(el('a', { href: `#/users/${encodeURIComponent(role)}`, class: 'gk-card' }, [
      el('h3', {}, role),
      el('p', {}, `${count} stor${count === 1 ? 'y' : 'ies'}`),
    ]));
  });
  container.appendChild(grid);
}
