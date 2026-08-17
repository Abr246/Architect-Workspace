// A small deterministic Q&A engine over the loaded plan/progress data.
// No external API — this is a static site with no key to hold. Every answer
// is computed from the same bundle the tabs render from, and every answer
// says which tab it came from. If nothing matches, it says so.

function pct(n, d) {
  return d ? `${n} / ${d}` : `${n}`;
}

export function answerQuestion(bundle, rawQuestion) {
  const q = (rawQuestion || '').trim().toLowerCase();
  const { plan, progress, requirements, storiesById, stories } = bundle;

  const reqMatch = rawQuestion.match(/REQ-\d+/i);
  if (reqMatch) {
    const req = requirements.find((r) => r.id.toLowerCase() === reqMatch[0].toLowerCase());
    if (!req) return { text: `No requirement ${reqMatch[0].toUpperCase()} in plan.json.`, cite: 'Knowledge base' };
    const covered = (req.fulfilled_by || []).map((id) => {
      const s = storiesById.get(id);
      return s ? `${id} (${s.verification.state})` : id;
    });
    const coverage = covered.length ? covered.join(', ') : 'no story yet — a real gap';
    return { text: `${req.id} (${req.kind}, ${req.priority}): "${req.statement}" Covered by: ${coverage}.`, cite: 'Knowledge base → Requirements' };
  }

  const storyMatch = rawQuestion.match(/STORY-\d+/i);
  if (storyMatch) {
    const s = storiesById.get(storyMatch[0].toUpperCase());
    if (!s) return { text: `No story ${storyMatch[0].toUpperCase()} in plan.json.`, cite: 'Project management' };
    return { text: `${s.id} — ${s.title}. Release ${s.release}, owner ${s.owner || 'unassigned'}, status ${s.verification.state}, due ${s.due_on}.`, cite: 'Project management' };
  }

  if (/\bverified\b|\bstories\b.*\bstatus\b|criteria passed|criteria total/.test(q)) {
    const t = progress?.totals;
    if (!t) return { text: 'No totals in progress.json yet.', cite: 'Overview' };
    return { text: `${pct(t.stories_verified, t.stories_total)} stories verified, ${pct(t.criteria_passed, t.criteria_total)} criteria passed, ${t.points_awarded} points awarded.`, cite: 'Overview' };
  }

  if (/\bpoints?\b/.test(q)) {
    const t = progress?.totals;
    return { text: t ? `${t.points_awarded} points awarded so far.` : 'No points data yet.', cite: 'Overview' };
  }

  if (/guardrail/.test(q)) {
    const gr = plan?.derived?.guardrails || [];
    if (gr.length === 0) return { text: 'No guardrail is defined yet — the plan has no requirement typed SAFE.', cite: 'Guardrails' };
    return { text: gr.map((g) => `${g.id}: ${g.statement}`).join(' | '), cite: 'Guardrails' };
  }

  if (/system|connect|integrat/.test(q)) {
    const sys = plan?.derived?.systems || [];
    if (sys.length === 0) return { text: 'No external system is named in the plan yet.', cite: 'Systems' };
    return { text: `Named systems: ${sys.join(', ')}. None of these are confirmed live from this page.`, cite: 'Systems' };
  }

  if (/measure|outcome|kpi|target/.test(q)) {
    const m = plan?.derived?.measures || [];
    if (m.length === 0) return { text: 'No numeric outcome measure is defined in the plan yet.', cite: 'Outcomes' };
    return { text: m.map((x) => `${x.id}: ${x.statement}`).join(' | '), cite: 'Outcomes' };
  }

  if (/role|who is this for|customer|user/.test(q)) {
    const roles = plan?.derived?.roles || [];
    return { text: roles.length ? `Roles: ${roles.join(', ')}.` : 'No roles defined yet.', cite: 'Users & use case' };
  }

  if (/agent/.test(q)) {
    const owners = new Set((stories || []).map((s) => s.owner).filter(Boolean));
    return { text: `No scoped agent roster is defined yet — story owners stand in for it: ${[...owners].join(', ')}.`, cite: 'AI agents' };
  }

  if (/release|schedule|demo|gantt/.test(q)) {
    const s = plan?.schedule;
    if (!s) return { text: 'No schedule defined.', cite: 'Project management' };
    return { text: `Build ${s.build_start} → ${s.build_end}, demo day ${s.demo_day}, ${(plan.releases || []).length} releases.`, cite: 'Project management' };
  }

  if (/gap|missing|not covered|uncovered/.test(q)) {
    const gaps = requirements.filter((r) => r.priority === 'must' && (r.fulfilled_by || []).length === 0);
    if (gaps.length === 0) return { text: 'No must-requirement is currently uncovered.', cite: 'Knowledge base' };
    return { text: `Uncovered must requirements: ${gaps.map((r) => r.id).join(', ')}.`, cite: 'Knowledge base → Requirements' };
  }

  return {
    text: "I can't answer that from the data on this page. Try a specific REQ-… or STORY-… id, or ask about stories, criteria, points, guardrails, systems, measures, roles, agents, or the release schedule.",
    cite: null,
  };
}
