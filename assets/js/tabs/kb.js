import { el } from '../router.js';
import { breadcrumb, emptyState, badgeFor, table, sectionTitle } from './common.js';
import { answerQuestion } from '../kbChat.js';

function renderChat(container, bundle) {
  const panel = el('div', { class: 'gk-chat' });
  panel.appendChild(sectionTitle('Ask the knowledge base'));
  const log = el('div', { class: 'gk-chat-log' });
  panel.appendChild(log);

  const form = el('form', { class: 'gk-chat-form' });
  const input = el('input', { type: 'text', placeholder: 'e.g. "what covers REQ-010?" or "how many stories are verified?"' });
  const button = el('button', { type: 'submit' }, 'Ask');
  form.appendChild(input);
  form.appendChild(button);
  panel.appendChild(form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    log.appendChild(el('div', { class: 'gk-chat-msg user' }, q));
    const { text, cite } = answerQuestion(bundle, q);
    const bot = el('div', { class: 'gk-chat-msg bot' }, [
      text,
      cite ? el('span', { class: 'gk-chat-cite' }, `Source: ${cite}`) : null,
    ]);
    log.appendChild(bot);
    log.scrollTop = log.scrollHeight;
    input.value = '';
  });

  container.appendChild(panel);
}

export function renderKB(container, ctx) {
  const { bundle, params } = ctx;
  const requirements = bundle.requirements || [];
  const storiesById = bundle.storiesById;

  if (params && params.length) {
    const req = requirements.find((r) => r.id === params[0]);
    container.appendChild(breadcrumb('kb', 'Knowledge base', params[0]));
    if (!req) {
      container.appendChild(emptyState('Requirement not found', `No requirement with id "${params[0]}".`));
      return;
    }
    container.appendChild(el('h1', { class: 'gk-tab-title' }, req.id));
    container.appendChild(el('p', { class: 'gk-tab-sub' }, req.statement));
    container.appendChild(el('p', {}, `Kind: ${req.kind} · Priority: ${req.priority} · Cluster: ${req.cluster || '—'}`));
    const ids = req.fulfilled_by || [];
    if (ids.length === 0) {
      container.appendChild(emptyState('Real gap', 'No story in plan.json currently fulfils this requirement.'));
      return;
    }
    const grid = el('div', { class: 'gk-card-grid' });
    ids.forEach((id) => {
      const s = storiesById.get(id);
      if (!s) return;
      grid.appendChild(el('a', { href: `#/pm/${id}`, class: 'gk-card' }, [
        el('h3', {}, `${s.id} — ${s.title}`),
        badgeFor(s.verification.state),
      ]));
    });
    container.appendChild(grid);
    return;
  }

  container.appendChild(el('h1', { class: 'gk-tab-title' }, 'Knowledge base'));
  container.appendChild(el('p', { class: 'gk-tab-sub' }, 'Everything the project knows about itself — requirements traced to stories, and a chat panel that answers from the same data.'));

  container.appendChild(sectionTitle('Requirement traceability'));
  if (requirements.length === 0) {
    container.appendChild(emptyState('No requirements yet', 'plan.requirements is empty.'));
  } else {
    container.appendChild(table(
      ['Requirement', 'Statement', 'Priority', 'Fulfilled by', 'Coverage'],
      requirements.map((r) => {
        const ids = r.fulfilled_by || [];
        const covered = ids.length > 0 && ids.every((id) => storiesById.get(id)?.verification?.state === 'verified');
        const gap = r.priority === 'must' && ids.length === 0;
        return [
          el('td', {}, el('a', { href: `#/kb/${r.id}` }, r.id)),
          el('td', {}, r.statement),
          el('td', {}, r.priority),
          el('td', {}, ids.length ? ids.join(', ') : (gap ? 'none — gap' : '—')),
          el('td', {}, covered
            ? el('span', { class: 'gk-badge gk-badge-verified' }, 'Covered & verified')
            : el('span', { class: `gk-badge ${gap ? 'gk-badge-not_started' : 'gk-badge-in_progress'}` }, gap ? 'Gap' : 'Not yet verified')),
        ];
      }),
    ));
  }

  renderChat(container, bundle);
}
